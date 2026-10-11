# Brevo welcome automations

Configured and activated on 2026-10-11, within the existing Free account.

| Workflow ID | Name | Trigger | Message |
| --- | --- | --- | --- |
| 1 | KA \| HU \| Welcome after confirmation | Added to Kaftan Angelo - Newsletter HU, list #3 | HU welcome, automation message #11, based on template #5 |
| 2 | KA \| EN \| Welcome after confirmation | Added to Kaftan Angelo - Newsletter EN, list #4 | EN welcome, independent automation message #12, same content as template #8 |

Both website forms were inspected: each uses Double confirmation email and its corresponding language list. The list-add trigger considers only contacts added after activation. No existing contact batch was enrolled. Contact re-entry is disabled for both workflows. No delay is configured: welcome follows list entry after confirmation.

Both messages use Kaftan Angelo <hello@kaftanangelo.com>, localized subjects and preview text, the existing JPEG hero, store/contact links with UTM tags, and the Brevo unsubscribe variable. No paid plan, website tracker, SMS, WhatsApp message or recurring product campaign was added.

Product selection and seasonal templates remain available for campaigns after current products and availability are reviewed. They are not sent on a recurring schedule.

Configuration and active status were verified in the UI. Real message delivery testing is awaiting user authorization; existing DOI delivery was tested separately before these workflows were created.

Manage workflows: https://app.brevo.com/automation/automations
