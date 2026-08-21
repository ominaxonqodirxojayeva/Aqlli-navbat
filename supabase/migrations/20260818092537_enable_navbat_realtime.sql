-- Enable realtime for navbat tables
ALTER PUBLICATION supabase_realtime ADD TABLE navbat_queues;
ALTER PUBLICATION supabase_realtime ADD TABLE navbat_queue_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE navbat_services;

-- Sync profile emails with auth.users
UPDATE profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id AND p.email IS NULL;