/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * The time it takes for Mail to display the message list from a cold start
 */
export interface EmailListDisplayTime {
  Value: number;
  Labels: {
    loaded:
      | "inbox"
      | "all-drafts"
      | "all-sent"
      | "trash"
      | "spam"
      | "all-mail"
      | "almost-all-mail"
      | "archive"
      | "sent"
      | "drafts"
      | "starred"
      | "outbox"
      | "scheduled"
      | "snoozed"
      | "custom";
    pageSize: "50" | "100" | "200";
  };
}
