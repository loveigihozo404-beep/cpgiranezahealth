# File storage setup

Run `file_storage_migration.sql` in the existing Supabase SQL editor after `schema.sql`. It adds file metadata columns, creates the six Storage buckets, and installs Storage policies.

## Buckets

- `course-files`: private course materials; admin upload, enrolled students read approved/completed course files.
- `certificates`: private certificate PDFs; admin upload, the certificate owner reads.
- `gallery`: public images for gallery and course covers.
- `career-files`: private resumes; public applicants may upload only under `job-applications/`, admins read.
- `profile-images`: private student profile photos; the owner and admins access them.
- `homecare-files`: private supporting documents; admins access them.

## Frontend limits

- Course materials: PDF, DOC, DOCX, PPT, PPTX, ZIP, JPG, PNG; 25 MB.
- Certificate: PDF; 15 MB.
- Course cover and gallery: JPG, PNG, WEBP; 10 MB.
- Profile photo: JPG, PNG, WEBP; 5 MB.
- Resume/CV: PDF, DOC, DOCX; 10 MB.

Files are renamed with a generated UUID and a sanitized original name. Private files are accessed through short-lived signed URLs. No service-role key is used in the frontend.

After applying the migration, use the existing admin dashboard to upload course materials, covers, certificates, and gallery images. Students can upload profile photos and download authorized course materials and certificates. Public applicants can attach a CV; admins can view/download it from Job Applications.
