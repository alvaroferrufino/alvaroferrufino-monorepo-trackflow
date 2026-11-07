This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Candidate Management

Set `NEXT_PUBLIC_API_URL` in `.env.local` to the API base URL, without `/records`.
Use **Nueva candidatura** in the list to register an application, or **Editar candidatura**
in the detail view to edit its personal and professional information.

The shared form is in `components/forms/candidate-form.tsx`, with strict domain types
in `app/lib/candidates.ts`. It sends `application/json` to `POST /records` or
`PUT /records/:id`, preserving the legacy API property names and numeric types.
Name, email, phone, position, years of experience and a CV file are required.
Experience is sent as `experience_years`, accepts zero and decimals, and must be
between 0 and 50 inclusive. Country, residence city, work authorization, availability, net annual
salary expectation in euros and recruitment source are also required. The exact salary
label is **Expectativa salarial neta anual en euros**; zero is valid, but empty or
negative values are not. The country selector uses the maintained Spanish ISO 3166
catalogue (including territories) and Kosovo, sorted by country name. Country values
are alpha-2 codes, with the commonly used `XK` extension for Kosovo.

Position is a required select with TrackFlow roles: Process Excellence Manager,
AI Engineer, Project Manager, Operations Lead, Logística y Operaciones and additional
technical roles. Existing historical positions remain selectable when editing so
unrelated updates do not force a role change. The phone block has a country/prefix
select before the contact number, using `libphonenumber-js` metadata. Phone is sent
in E.164 format (for example `+59171234567`); `phone_country` retains the selected
country, including when multiple countries share a calling code. Existing international
numbers are split into country prefix and national number for editing.

Before POST/PUT, the client reads all pages of `/records` and compares trimmed emails
case-insensitively. Editing excludes the current record ID. A duplicate displays
**Este candidato ya se encuentra en el pipeline con ese email** and prevents writing.
An unsuccessful/incomplete duplicate check also cancels the write rather than guessing.
Controls stay disabled during verification, file reading, the API request and local saving.
This is a client-side safeguard, not a concurrency guarantee: the backend must enforce
email uniqueness atomically to prevent races between users or tabs.

The country selector appears immediately before the residence-city input in both
forms, including their DOM and keyboard navigation order. Availability is a required
numeric input labeled **Disponibilidad (en días) \*** with an informative legend.
Only nonnegative whole days are accepted; zero means immediate availability. JSON
and IndexedDB store `availability` as a number, and the detail renders the unit,
for example **15 días**, **30 días**, **0 días** or **1 día**. Empty values, negatives,
fractions and unsafe integers are rejected.

Legacy exact day strings, weeks and known availability codes are converted to days.
Weeks use seven days; legacy month values use an explicitly defined thirty-day convention.
Unbounded or free-text availability without an exact duration is not guessed: the
numeric value remains null and the original text is preserved in `availability_details`.
Editing shows that original text as a hint and requires an explicit day count.
LinkedIn and additional relevant URLs are optional; all links must use HTTP(S).
Multiple relevant URLs can be entered one per line.

Every empty detail field consistently renders exactly **No indicado**, including
LinkedIn, CV, relevant URLs, additional documents and dates. Null, empty strings,
whitespace and empty collections do not leave blank rows. Zero remains a real value,
not an empty-field marker. Missing status/stage options also use **No indicado**.

The CV must be a nonempty PDF, DOC or DOCX file, no larger than 5,242,880 bytes
(5 MB in the UI). File selection is required for both create and edit, even when the
candidate already has a CV. Native file inputs cannot be prefilled. Validation failures
and request errors retain the selection for retry while the form remains mounted.
Optional additional files accept PDF, DOC, DOCX, JPG/JPEG and PNG: up to 5 MB per
file, five files and 10 MB combined. Empty files are rejected. Existing additional
files returned by the API are retained on edit unless explicitly removed.
The CV and each selected or retained additional file have a visible **Quitar archivo**
action. Removing a selected file clears its React state and native FileList before
submission. Removing a CV does not bypass its required validation: select another CV
before saving. Removing an existing additional file excludes it from the next PUT.
Status and stage remain managed by the existing PATCH controls; completed stages
are presentation-only.

While saving, fields and actions are disabled. Validation and request errors preserve
the entered values for retry. A successful create reloads the list data; a successful
edit updates the detail locally. Neither operation reloads the document.

### JSON Mapping And API Compatibility

The currently configured simulated API documents only the legacy JSON fields, including
`cv_url`. Requests keep that contract and add serializable properties for the new UX.
**Accepting a JSON request is not proof that extended fields or files were persisted.**
The API may ignore undocumented properties. As explicitly approved, professional data
and documents are additionally persisted in IndexedDB in this browser after a successful
API write. Tests verify local persistence across reloads, not shared backend file storage.

| JSON Property                             | Value                                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| `full_name`, `email`, `phone`, `position` | Required trimmed text                                                                     |
| `experience_years`                        | Required number between 0 and 50 inclusive                                                |
| `phone_country`                           | Selected phone country code; `phone` is the full E.164 number                             |
| `linkedin_url`                            | Optional HTTP(S) URL or null                                                              |
| `cv_url`                                  | Existing CV URL on edit, otherwise null; never a blob/data URL generated from a selection |
| `cv_file`                                 | Required serialized file object                                                           |
| `country`                                 | Required country code                                                                     |
| `location`                                | Required residence city                                                                   |
| `work_authorization`                      | `valid_permit` or `visa_sponsorship`                                                      |
| `availability`                            | Required nonnegative integer number of days                                               |
| `availability_details`                    | Null on new POST/PUT; retained only for reading legacy records                            |
| `expected_salary`                         | Required nonnegative number: net annual salary in EUR                                     |
| `recruitment_source`                      | `linkedin`, `job_board`, `referral`, `social_media` or `other`                            |
| `relevant_urls`                           | Array of HTTP(S) URLs; empty array if omitted                                             |
| `additional_files`                        | Array of serialized file objects; empty array if omitted                                  |

Each serialized file contains `name`, `type` (MIME), `size` (bytes) and
`content_base64` (raw Base64, without a data-URL prefix). `FileReader` reads the files
while the entire form remains disabled. No File object is JSON-stringified directly;
no localStorage or temporary object URL is used as file persistence. Base64 increases
payload size by roughly one third, so the server's request-size limit must accommodate
the 5 MB CV plus up to 10 MB of additional files and JSON overhead.

Successful HTTP responses confirm the record request. Creation additionally requires
the returned record ID to associate the local complement; editing already has its ID
and can accept a bodyless success response. Only after the IndexedDB transaction
commits does the form announce success and update the UI without reloading. The HTTP
response does not independently confirm an upload. A returned HTTP(S) `cv_url` is accepted when
present. Otherwise the prior legacy URL is preserved, and the newly selected CV is
shown by filename in the locally updated detail, not by a misleading old-file link.

To persist the extension, the backend must decode and validate files, inspect their
actual content/MIME, independently enforce all limits, validate fields, and use
access-controlled storage appropriate for personal recruitment data. It must return
extended fields in GET responses for prefill. PUT must clear optional values when
null/empty arrays are provided and preserve status/stage. Missing extended fields in
legacy GET responses are normalized to null or empty arrays in the client; newly
required fields must then be completed if there is no local complement.

### Local Complement

`app/lib/candidate-storage.ts` stores the phone country, professional fields, CV and
additional documents in the `trackflow-candidates` IndexedDB database, keyed by normalized
API base URL and record ID. The detail loads the remote record first and overlays the
last locally saved complement, so navigation and reloads do not lose those fields when
the simulated GET omits them. A successful PUT replaces the complement, including cleared
optional arrays and removed attachments. Existing API records are never filled with
invented defaults; records without a complement retain the available remote data.

This is browser-local persistence, not synchronization across devices, browsers or users.
Another operator using a different browser cannot see this complement. Local values take
precedence for these fields and will not automatically reflect another operator's changes.
Clearing site data, private-browsing expiry, quota/permission limits or browser eviction
can remove or prevent the complement. Personal data/documents are stored under the site's
origin; use only a trusted device. Clearing this site's storage removes the local copy,
not the API record. Production use requires an authenticated, access-controlled backend.

If the API saves successfully but returns no ID on creation, or the local write fails,
the UI explicitly reports the partial success and asks the operator to verify the record
before retrying. It does not display a complete-success confirmation or silently discard
the local-storage error. If reading local data fails, the detail reports an error with
a retry action rather than silently showing a potentially incomplete record.

`parseCandidate` in `app/lib/candidates.ts` is the shared deserialization boundary.
It accepts direct records and `data`/`record`/`candidate` wrappers, including JSON
strings. It maps snake_case and supported camelCase properties, plus residence/notice
period aliases, and deserializes URL/file arrays and individual file objects. Serialized
documents normalize filename, MIME, byte size and Base64 content to `CandidateFile`.
The detail and editing form use the same normalized data. Zero salary remains visible;
invalid documents are not treated as valid attachments, and truly absent data is not
invented. The real GET inspected on 2026-11-07 still returned only legacy fields; the
authorized local complement supplies previously saved professional data in this browser.

### Browser Tests

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

The twenty-nine Playwright scenarios cover required fields, country options and DOM order,
numeric days and legacy availability migration, consistent empty markers and zero values,
net salary, optional URLs/attachments, JSON bytes and filenames,
CV/additional-file format and size limits, professional-field prefill and removal,
model aliases and deserialization, file-selection removal, duplicate submission prevention,
positions, international phones, experience bounds, normalized/paginated email checks,
IndexedDB POST/PUT persistence across reloads and storage failures,
HTTP/network errors, retries, cancellation, legacy
API responses, local updates and desktop/mobile layouts. API requests are intercepted,
so tests do not modify real records.
The test server runs on port 3100 with a mock API base URL; stop any development server
before running the suite to avoid Next.js development lock conflicts. Screenshots and
failure traces are generated in `test-results/` and excluded from version control.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
