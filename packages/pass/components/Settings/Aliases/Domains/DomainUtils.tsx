import { type ReactNode } from 'react';

import { c } from 'ttag';

import { Href } from '@proton/atoms';
import { Alert } from '@proton/components';
import proxyScreenshot from '@proton/pass/assets/alias/proxy-screenshot.png';
import { Card } from '@proton/pass/components/Layout/Card/Card';

import type { CustomDomain } from './DomainsProvider';

export type CustomDomainDNSSection = {
    disabled?: boolean;
    errorMessages?: string[];
    isVerified: boolean;
    loading?: boolean;
    title: string;
    content: ReactNode;
};

const WIKIPEDIA_LINK_SPF = (
    <Href href="https://wikipedia.org/wiki/Sender_Policy_Framework" key="wikipedia-spf">
        (Wikipedia↗)
    </Href>
);
const WIKIPEDIA_LINK_DKIM = (
    <Href href="https://wikipedia.org/wiki/DomainKeys_Identified_Mail" key="wikipedia-dkim">
        (Wikipedia↗)
    </Href>
);

const WIKIPEDIA_LINK_DMARC = (
    <Href href="https://wikipedia.org/wiki/DMARC" key="wikipedia-dmarc">
        (Wikipedia↗)
    </Href>
);

const getDomainValueMessage = (domain: ReactNode) =>
    c('Description')
        .jt`Some DNS registrar might require a full record path, in this case please use ${domain} as domain value instead.`;

export const getDNSSections = (domain: CustomDomain): CustomDomainDNSSection[] => {
    const domainPath = domain.Domain;

    const domainKey = (
        <span className="text-italic" key="dns-domain-key">
            dkim._domainkey.{domainPath}
        </span>
    );
    const domainKeyExampleSubdomain = (
        <span className="text-italic" key="dns-domain-key-subdomain">
            dkim._domainkey.subdomain
        </span>
    );
    const domainKeyExampleMail = (
        <span className="text-italic" key="dns-domain-key-mail">
            dkim._domainkey.mail
        </span>
    );
    const dmarc = (
        <span className="text-italic" key="dns-dmarc">
            _dmarc.{domainPath}
        </span>
    );
    const dmarcExampleSubdomain = (
        <span className="text-italic" key="dns-dmarc-subdomain">
            _dmarc.subdomain
        </span>
    );
    const subdomainExample = (
        <span className="text-italic" key="dns-subdomain-example">
            subdomain.domain.com
        </span>
    );

    return [
        {
            title: c('Title').t`Domain ownership verification`,
            content: (
                <>
                    <div>{c('Description')
                        .t`To verify ownership of the domain, please add the following TXT record. Some domain registrars (Namecheap, CloudFlare, etc) might use @ for the root domain.`}</div>
                    <Card className="border my-3 flex flex-column gap-3">
                        <div>{c('Info').t`Record: TXT`}</div>
                        <div>{c('Info').t`Domain: ${domainPath} or @`}</div>
                        <div>
                            {c('Info').t`Value:`} <mark className="bg-warning">{domain.VerificationRecord}</mark>
                        </div>
                    </Card>
                </>
            ),
            isVerified: domain.OwnershipVerified,
            errorMessages: domain.VerificationErrors,
        },
        {
            title: c('Title').t`MX record`,
            content: (
                <>
                    <div>{c('Description')
                        .t`Add the following MX DNS record to your domain. Please note that there's a dot (.) at the end target addresses. If your domain registrar doesn't allow this trailing dot, please remove it when adding the DNS record.`}</div>
                    <div>{c('Description')
                        .t`Some domain registrars (Namecheap, CloudFlare, etc) might also use @ for the root domain.`}</div>
                    <Card className="border my-3 flex flex-column gap-3">
                        <div>{c('Info').t`Record: MX`}</div>
                        <div>{c('Info').t`Domain: ${domainPath} or @`}</div>
                        <div>{c('Label').t`Priority:`} 10</div>
                        <div>
                            {c('Label').t`Target:`} <mark className="bg-warning">mx1.simplelogin.co.</mark>
                        </div>
                    </Card>
                    <Card className="border my-3 flex flex-column gap-3">
                        <div>{c('Info').t`Record: MX`}</div>
                        <div>{c('Info').t`Domain: ${domainPath} or @`}</div>
                        <div>{c('Label').t`Priority:`} 20</div>
                        <div>
                            {c('Label').t`Target:`} <mark className="bg-warning">mx2.simplelogin.co.</mark>
                        </div>
                    </Card>
                </>
            ),
            isVerified: domain.MxVerified,
            errorMessages: domain.MxErrors,
        },
        {
            title: c('Title').t`SPF (Optional)`,
            content: (
                <>
                    <div>{c('Description')
                        .jt`SPF ${WIKIPEDIA_LINK_SPF} is an email authentication method designed to detect forging sender addresses during the delivery of the email. Setting up SPF is highly recommended to reduce the chance your emails ending up in the recipient's Spam folder.`}</div>
                    <div>{c('Description').t`Add the following TXT DNS record to your domain.`}</div>
                    <Card className="border my-3 flex flex-column gap-3">
                        <div>{
                            // translator: DNS record type
                            c('Info').t`Record: TXT`
                        }</div>
                        <div>{c('Info').t`Domain: ${domainPath} or @`}</div>
                        <div>
                            {c('Label').t`Value:`}{' '}
                            <mark className="bg-warning">v=spf1 include:simplelogin.co ~all</mark>
                        </div>
                    </Card>
                </>
            ),
            isVerified: domain.SpfVerified,
            errorMessages: domain.SpfErrors,
        },
        {
            title: c('Title').t`DKIM (Optional)`,
            content: (
                <>
                    <div>{c('Description')
                        .jt`DKIM ${WIKIPEDIA_LINK_DKIM} is an email authentication method designed to avoid email spoofing. Setting up DKIM is highly recommended to reduce the chance your emails ending up in the recipient's Spam folder.`}</div>
                    <div>{c('Description').t`Add the following CNAME DNS records to your domain.`}</div>
                    <Card className="border my-3 flex flex-column gap-3">
                        <div>{c('Info').t`Record: CNAME`}</div>
                        <div>
                            {c('Label').t`Domain:`} <mark className="bg-warning">dkim._domainkey</mark>
                        </div>
                        <div>
                            {c('Label').t`Value:`} <mark className="bg-warning">dkim._domainkey.simplelogin.co.</mark>
                        </div>
                    </Card>
                    <Card className="border my-3 flex flex-column gap-3">
                        <div>{c('Info').t`Record: CNAME`}</div>
                        <div>
                            {c('Label').t`Domain:`} <mark className="bg-warning">dkim02._domainkey</mark>
                        </div>
                        <div>
                            {c('Label').t`Value:`} <mark className="bg-warning">dkim02._domainkey.simplelogin.co.</mark>
                        </div>
                    </Card>
                    <Card className="border my-3 flex flex-column gap-3">
                        <div>{c('Info').t`Record: CNAME`}</div>
                        <div>
                            {c('Label').t`Domain:`} <mark className="bg-warning">dkim03._domainkey</mark>
                        </div>
                        <div>
                            {c('Label').t`Value:`} <mark className="bg-warning">dkim03._domainkey.simplelogin.co.</mark>
                        </div>
                    </Card>
                    <Alert className="mb-3" type="success">
                        <div>{getDomainValueMessage(domainKey)}</div>
                        {c('Description')
                            .jt`If you are using a subdomain, e.g. subdomain.domain.com, you need to use ${domainKeyExampleSubdomain} as the domain instead. That means, if your domain is mail.domain.com you should enter ${domainKeyExampleMail} as the Domain.`}
                    </Alert>
                    <Alert className="mb-3" type="success">
                        <div className="mb-3">{c('Description')
                            .t`If you are using CloudFlare, please make sure to not select the Proxy option.`}</div>
                        <img src={proxyScreenshot} alt="Image of Cloudflare Proxy option" />
                    </Alert>
                </>
            ),
            isVerified: domain.DkimVerified,
            errorMessages: domain.DkimErrors,
        },
        {
            title: c('Title').t`DMARC (Optional)`,
            content: (
                <>
                    <div>{c('Description')
                        .jt`DMARC ${WIKIPEDIA_LINK_DMARC} is designed to protect the domain from unauthorized use, commonly known as email spoofing. Built around SPF and DKIM, a DMARC policy tells the receiving mail server what to do if neither of those authentication methods passes.`}</div>
                    <div>{c('Description').t`Add the following TXT DNS record to your domain.`}</div>
                    <Card className="border my-3 flex flex-column gap-3">
                        <div>{c('Info').t`Record: TXT`}</div>
                        <div>
                            {c('Label').t`Domain:`} <mark className="bg-warning">_dmarc</mark>
                        </div>
                        <div>
                            {c('Label').t`Value:`}{' '}
                            <mark className="bg-warning">v=DMARC1; p=quarantine; pct=100; adkim=s; aspf=s</mark>
                        </div>
                    </Card>
                    <Alert className="mb-3" type="success">
                        <div>{getDomainValueMessage(dmarc)}</div>
                        <div>
                            {c('Description')
                                .jt`If you are using a subdomain, e.g. ${subdomainExample}, you need to use ${dmarcExampleSubdomain} as the domain instead.`}
                        </div>
                    </Alert>
                </>
            ),
            isVerified: domain.DmarcVerified,
            errorMessages: domain.DmarcErrors,
        },
    ];
};
