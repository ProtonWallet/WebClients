import type { UnknownAction } from '@reduxjs/toolkit';
import { createNextState, createSelector } from '@reduxjs/toolkit';
import type { ThunkAction } from 'redux-thunk';
import { c } from 'ttag';

import type { ProtonThunkArguments } from '@proton/redux-shared-store-types';
import { getApiErrorMessage } from '@proton/shared/lib/api/helpers/apiErrorHelper';
import { getSilentApi } from '@proton/shared/lib/api/helpers/customConfig';
import { unprivatizeMemberKeysRoute } from '@proton/shared/lib/api/members';
import { captureMessage } from '@proton/shared/lib/helpers/sentry';
import type {
    EnhancedMember,
    Member,
    MemberReadyForAutomaticUnprivatization,
    MemberReadyForManualUnprivatization,
} from '@proton/shared/lib/interfaces';
import {
    UnprivatizationRevisionError,
    getIsMemberInAutomaticApproveState,
    getIsMemberInManualApproveState,
    getSentryError,
    type getUnprivatizeMemberPayload,
    unprivatizeMemberHelper,
} from '@proton/shared/lib/keys';

import type { KtState } from '../kt';
import { getKTUserContext } from '../kt/actions';
import type { MemberState } from '../member';
import type { OrganizationKeyState } from '../organizationKey';
import { organizationKeyThunk } from '../organizationKey';
import { userKeysThunk } from '../userKeys';
import { unprivatizeMember } from './actions';
import { getMember } from './getMember';
import {
    type MembersState,
    type UnprivatizationMemberApproval,
    type UnprivatizationMemberFailure,
    type UnprivatizationMemberSuccess,
    getMemberAddresses,
    selectMembers,
    setUnprivatizationState,
    upsertMember,
} from './index';

type RequiredState = KtState & MemberState & MembersState & OrganizationKeyState;

export const selectUnprivatizationState = (state: MembersState) => state.members.unprivatization;

type JoinedResult =
    | (UnprivatizationMemberApproval & {
          member: MemberReadyForManualUnprivatization;
      })
    | (UnprivatizationMemberFailure & {
          member: MemberReadyForAutomaticUnprivatization;
      })
    | (UnprivatizationMemberSuccess & {
          member: EnhancedMember;
      });

const getJoinedUnprivatizationMemberList = (
    unprivatizationState: ReturnType<typeof selectUnprivatizationState>,
    membersState: ReturnType<typeof selectMembers>
): JoinedResult[] => {
    const membersList = Object.entries(unprivatizationState.members).map(([key, value]) => {
        return {
            id: key,
            value,
        };
    });
    let membersMap: { [key: string]: EnhancedMember } = {};
    if (membersList.length > 0 && membersState.value) {
        membersMap = Object.fromEntries(membersState.value.map((member) => [member.ID, member]));
    }
    return membersList.reduce<JoinedResult[]>((acc, cur) => {
        const member = membersMap[cur.id];
        if (!cur.value || !member) {
            return acc;
        }
        if (cur.value.type === 'approval' && getIsMemberInManualApproveState(member)) {
            acc.push({
                ...cur.value,
                member: member,
            });
        }
        if (cur.value.type === 'error' && getIsMemberInAutomaticApproveState(member)) {
            acc.push({
                ...cur.value,
                member: member,
            });
        }
        if (cur.value.type === 'success') {
            acc.push({
                ...cur.value,
                member: member,
            });
        }
        return acc;
    }, []);
};

const reportSentryError = (error: any) => {
    const sentryError = getSentryError(error);
    if (sentryError) {
        captureMessage('Unprivatization: Error unprivatizing member', {
            level: 'error',
            extra: { error: sentryError },
        });
    }
};

const getErrorState = (error: any) => {
    const apiErrorMessage = getApiErrorMessage(error);
    const errorMessage = apiErrorMessage || error?.message || c('Error').t`Unknown error`;
    return {
        type: 'error',
        error: errorMessage,
        revision: error instanceof UnprivatizationRevisionError,
    } as const;
};

export const selectJoinedUnprivatizationState = createSelector(
    [selectUnprivatizationState, selectMembers],
    (unprivatizationState, membersState) => {
        const result = getJoinedUnprivatizationMemberList(unprivatizationState, membersState);
        const filteredResult = result.reduce<{
            failures: (UnprivatizationMemberFailure & { member: MemberReadyForAutomaticUnprivatization })[];
            approval: (UnprivatizationMemberApproval & { member: MemberReadyForManualUnprivatization })[];
        }>(
            (acc, cur) => {
                if (cur.type === 'error' && cur.revision) {
                    acc.failures.push(cur);
                }
                if (cur.type === 'approval') {
                    acc.approval.push(cur);
                }
                return acc;
            },
            { failures: [], approval: [] }
        );
        return {
            ...filteredResult,
            loading: unprivatizationState.loading,
        };
    }
);

export const unprivatizeMembersManualHelper = ({
    membersToUnprivatize,
}: {
    membersToUnprivatize: MemberReadyForManualUnprivatization[];
}): ThunkAction<
    Promise<{
        membersToUpdate: Member[];
        membersToError: { member: Member; error: any }[];
    }>,
    MembersState & OrganizationKeyState,
    ProtonThunkArguments,
    UnknownAction
> => {
    return async (dispatch, getState, extra) => {
        const membersToUpdate: Member[] = [];
        const membersToError: { member: Member; error: any }[] = [];
        extra.eventManager.stop();
        const api = getSilentApi(extra.api);
        for (const member of membersToUnprivatize) {
            try {
                const [userKeys, organizationKey, memberAddresses] = await Promise.all([
                    dispatch(userKeysThunk()),
                    dispatch(organizationKeyThunk()), // Fetch org key again to ensure it's up-to-date.
                    dispatch(getMemberAddresses({ member, retry: true })),
                ]);
                const payload = await unprivatizeMemberHelper({
                    data: {
                        ActivationToken: member.Unprivatization.ActivationToken,
                        PrivateKeys: member.Unprivatization.PrivateKeys,
                    },
                    memberAddresses,
                    verificationKeys: null,
                    organizationKey,
                    userKeys,
                });
                await api(unprivatizeMemberKeysRoute(member.ID, payload));
                const newMember = await getMember(api, member.ID);
                membersToUpdate.push(newMember);
            } catch (error: any) {
                membersToError.push({ member, error });
            }
        }
        extra.eventManager.start();
        return { membersToUpdate, membersToError };
    };
};

export const unprivatizeMembersManual = ({
    membersToUnprivatize,
}: {
    membersToUnprivatize: MemberReadyForManualUnprivatization[];
}): ThunkAction<Promise<Member[]>, MembersState & OrganizationKeyState, ProtonThunkArguments, UnknownAction> => {
    return async (dispatch, getState) => {
        if (!membersToUnprivatize.length) {
            return [];
        }

        {
            const oldState = selectUnprivatizationState(getState());
            if (oldState.loading.approval) {
                return [];
            }
            const newState = createNextState(oldState, (state) => {
                state.loading.approval = true;
            });
            dispatch(setUnprivatizationState(newState));
        }

        const { membersToUpdate, membersToError } = await dispatch(
            unprivatizeMembersManualHelper({ membersToUnprivatize })
        );

        membersToError.forEach(({ error }) => {
            reportSentryError(error);
        });

        {
            const oldState = selectUnprivatizationState(getState());
            const newState = createNextState(oldState, (state) => {
                state.loading.approval = false;

                membersToUpdate.forEach((member) => {
                    state.members[member.ID] = { type: 'success' };
                });

                membersToError.forEach(({ member, error }) => {
                    state.members[member.ID] = getErrorState(error);
                });
            });

            if (newState !== oldState) {
                dispatch(setUnprivatizationState(newState));
            }
        }

        membersToUpdate.forEach((member) => {
            dispatch(upsertMember({ member }));
        });

        return membersToUpdate;
    };
};

const getMembersToUnprivatize = ({
    members,
    oldState,
}: {
    members: EnhancedMember[];
    oldState: ReturnType<typeof selectUnprivatizationState>;
}): {
    membersToApprove: Member[];
    membersToDelete: string[];
    membersToUnprivatize: MemberReadyForAutomaticUnprivatization[];
} => {
    const membersToDelete: string[] = [];
    const membersToApprove: Member[] = [];
    const membersToUnprivatize: MemberReadyForAutomaticUnprivatization[] = [];

    members.forEach((member) => {
        const item = oldState.members[member.ID];
        if (getIsMemberInAutomaticApproveState(member)) {
            if (!item) {
                membersToUnprivatize.push(member);
            }
        } else if (getIsMemberInManualApproveState(member)) {
            if (!item) {
                membersToApprove.push(member);
            }
            // If there is a previous error and the user is no longer to unprivatize, delete it
        } else if (item && item.type === 'error') {
            membersToDelete.push(member.ID);
        }
    });

    return { membersToUnprivatize, membersToDelete, membersToApprove };
};

export const unprivatizeMembersAutomaticHelper = ({
    membersToUnprivatize,
    options,
}: {
    membersToUnprivatize: MemberReadyForAutomaticUnprivatization[];
    options?: Parameters<typeof getUnprivatizeMemberPayload>[0]['options'];
}): ThunkAction<
    Promise<{
        membersToUpdate: Member[];
        membersToError: { member: Member; error: any }[];
    }>,
    RequiredState,
    ProtonThunkArguments,
    UnknownAction
> => {
    return async (dispatch, getState, extra) => {
        const membersToUpdate: Member[] = [];
        const membersToError: { member: Member; error: any }[] = [];

        extra.eventManager.stop();
        const api = getSilentApi(extra.api);
        const ktUserContext = await dispatch(getKTUserContext());
        for (const member of membersToUnprivatize) {
            try {
                await dispatch(
                    unprivatizeMember({
                        member,
                        api,
                        options,
                        ktUserContext,
                    })
                );
                const newMember = await getMember(api, member.ID);
                membersToUpdate.push(newMember);
            } catch (error: any) {
                membersToError.push({ member, error });
            }
        }
        extra.eventManager.start();
        return { membersToUpdate, membersToError };
    };
};

export const unprivatizeMembersAutomatic = ({
    options,
    target,
}: {
    options?: Parameters<typeof getUnprivatizeMemberPayload>[0]['options'];
    target:
        | {
              type: 'background';
              members: EnhancedMember[];
          }
        | {
              type: 'action';
              members: MemberReadyForAutomaticUnprivatization[];
          };
}): ThunkAction<Promise<void>, RequiredState, ProtonThunkArguments, UnknownAction> => {
    return async (dispatch, getState) => {
        if (!target.members.length) {
            return;
        }

        const oldState = selectUnprivatizationState(getState());
        if (oldState.loading.automatic) {
            return;
        }

        const { membersToUnprivatize, membersToDelete, membersToApprove } =
            target.type === 'action'
                ? { membersToUnprivatize: target.members, membersToDelete: [], membersToApprove: [] }
                : getMembersToUnprivatize({
                      members: target.members,
                      oldState,
                  });

        if (membersToUnprivatize.length || membersToApprove.length || membersToDelete.length) {
            const newState = createNextState(oldState, (state) => {
                state.loading.automatic = Boolean(membersToUnprivatize.length);

                membersToApprove.forEach((member) => {
                    state.members[member.ID] = { type: 'approval' };
                });

                membersToDelete.forEach((memberID) => {
                    delete state.members[memberID];
                });
            });

            if (oldState !== newState) {
                dispatch(setUnprivatizationState(newState));
            }
        }

        if (!membersToUnprivatize.length) {
            return;
        }

        const { membersToError, membersToUpdate } = await dispatch(
            unprivatizeMembersAutomaticHelper({
                membersToUnprivatize,
                options,
            })
        );

        membersToError.forEach(({ error }) => {
            reportSentryError(error);
        });

        {
            const oldState = selectUnprivatizationState(getState());
            const newState = createNextState(oldState, (state) => {
                state.loading.automatic = false;

                membersToUpdate.forEach((member) => {
                    state.members[member.ID] = { type: 'success' };
                });

                membersToError.forEach(({ member, error }) => {
                    state.members[member.ID] = getErrorState(error);
                });
            });

            if (newState !== oldState) {
                dispatch(setUnprivatizationState(newState));
            }
        }

        membersToUpdate.forEach((member) => {
            dispatch(upsertMember({ member }));
        });
    };
};
