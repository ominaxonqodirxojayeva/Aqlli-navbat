/*
# Make service_id nullable in navbat_queue_settings

The queue_settings table was originally service-based (service_id NOT NULL).
Now we support organization-based queues, so service_id must be nullable.
Organization-based settings use organization_id instead.
*/

ALTER TABLE navbat_queue_settings ALTER COLUMN service_id DROP NOT NULL;