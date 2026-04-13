# Requirements Document

## Introduction

The Carnatic Artist Portal is a web-based portfolio platform for Carnatic musicians (singers and instrumentalists) based in The Netherlands. The portal enables artists to create and manage rich biographical portfolios, discover and connect with fellow artists for collaborations, and communicate through moderated group chats. Visitors can browse artist profiles publicly, while registered and approved artists gain access to collaboration tools, an availability calendar, and a structured artist search. The platform is built mobile-first with Progressive Web App (PWA) capabilities, and presents each artist's profile with speciality-based visual theming to create an appealing, clutter-free experience.

---

## Glossary

- **Portal**: The Carnatic Artist Portal web application.
- **Visitor**: An unauthenticated user browsing the Portal.
- **Artist**: A Carnatic musician (singer or instrumentalist) who has been approved and holds a Portal account.
- **Applicant**: A person who has submitted a registration request but has not yet been approved.
- **Admin**: A privileged Portal user responsible for approving Applicants and moderating content.
- **Profile**: The publicly visible portfolio page of an Artist, including bio, photos, video links, and speciality information.
- **Speciality**: The primary musical discipline(s) of an Artist (e.g., Vocal, Violin, Mridangam, Veena, Flute, Ghatam). An Artist may have multiple Specialities.
- **Collab**: A group chat session created by an Artist to coordinate an upcoming musical collaboration. Also referred to as a group chat.
- **Availability Calendar**: A calendar interface on an Artist's profile where the Artist marks dates they are available for collaboration.
- **Login Link**: A secure, time-limited authentication link sent to an Artist's email address to grant Portal access.
- **PWA**: Progressive Web App - a web application that can be installed on mobile devices and works offline for key features.
- **Registration Request**: The initial form submission by an Applicant seeking to join the Portal.
- **Feedback**: A written review left by one Artist about another Artist following a completed Collab.

---

## Requirements

### Requirement 1: Artist Registration Request

**User Story:** As an Applicant, I want to submit a registration request with my details, so that I can be considered for a portfolio on the Portal.

#### Acceptance Criteria

1. THE Portal SHALL provide a publicly accessible registration form for Applicants.
2. WHEN an Applicant submits the registration form, THE Portal SHALL require the following mandatory fields: full name, email address, contact number, contact type (WhatsApp or mobile-only, selected via a toggle or radio button alongside the contact number field), profile photo, and at least one Speciality (maximum three Specialities).
3. WHEN an Applicant submits the registration form, THE Portal SHALL accept the following optional fields: background image, personal or professional website URLs (one or more), LinkedIn URL, Instagram URL, Facebook URL, Twitter/X URL, YouTube channel URL, and a biographical write-up.
4. THE Portal SHALL accept a biographical write-up that supports rich text including embedded photos and video links (e.g., YouTube, Vimeo).
5. THE Portal SHALL display a contact type toggle or radio button directly alongside the contact number field, allowing the Applicant to indicate whether the number is a WhatsApp number or a mobile-only number. This contact type indicator is NOT a separate free-text field; it is a required selection (either "WhatsApp" or "Mobile only") that the Applicant must make as part of providing their contact number.
6. WHEN an Applicant submits the registration form with all mandatory fields present and valid, THE Portal SHALL store the Registration Request and display a confirmation message to the Applicant.
7. IF an Applicant submits the registration form with one or more mandatory fields missing or invalid, THEN THE Portal SHALL display field-level validation errors and SHALL NOT submit the form.
8. THE Portal SHALL accept between one and three Specialities per Applicant (at least one is mandatory; no more than three may be selected) to support multi-instrument artists.
9. WHEN a registration form is successfully submitted, THE Portal SHALL notify all Admins of the new pending Registration Request.

---

### Requirement 2: Admin Approval Workflow

**User Story:** As an Admin, I want to review and approve or reject Registration Requests, so that only genuine Carnatic artists are admitted to the Portal.

#### Acceptance Criteria

1. THE Admin Dashboard SHALL display all pending Registration Requests with the Applicant's submitted details.
2. WHEN an Admin views a Registration Request, THE Admin Dashboard SHALL present the Applicant's name, email, contact number, profile photo, Specialities, biographical write-up, and any optional links.
3. WHEN an Admin approves a Registration Request, THE Portal SHALL create an Artist account and send a Login Link to the Applicant's registered email address.
4. WHEN an Admin rejects a Registration Request, THE Portal SHALL mark the request as rejected and SHALL NOT create an Artist account.
5. THE Login Link SHALL expire after 72 hours from the time of issue.
6. WHEN an Artist uses a Login Link to access the Portal for the first time, THE Portal SHALL authenticate the Artist and redirect them to their Profile management page.
7. IF an Artist attempts to use an expired Login Link, THEN THE Portal SHALL display an expiry message and provide an option to request a new Login Link.
8. THE Admin Dashboard SHALL allow Admins to search and filter Registration Requests by status (pending, approved, rejected) and submission date.

---

### Requirement 3: Artist Profile Management

**User Story:** As an Artist, I want to manage my portfolio profile, so that I can keep my biographical information accurate and up to date.

#### Acceptance Criteria

1. WHEN an Artist is authenticated, THE Portal SHALL provide a profile management interface where the Artist can edit all fields submitted during registration. The Artist profile SHALL mandatorily include: full name, email address, contact number, contact type (WhatsApp or mobile-only toggle alongside the contact number field), profile photo, province, and at least one Speciality (maximum three Specialities).
2. THE Profile management interface SHALL allow the Artist to add, edit, or remove Specialities, subject to the constraint that at least one Speciality must always be present and no more than three Specialities may be associated with the Artist. The UX SHALL provide an "Add Speciality" control that is hidden or disabled once three Specialities have been selected.
3. THE Profile management interface SHALL allow the Artist to update the biographical write-up with rich text, embedded photos, and video links.
4. THE Profile management interface SHALL allow the Artist to upload or replace the profile photo and optional background image.
5. THE Profile management interface SHALL allow the Artist to add, edit, or remove external links (personal website, social media, YouTube).
6. WHEN an Artist saves profile changes, THE Portal SHALL validate all mandatory fields and, if valid, persist the changes and display a success confirmation.
7. IF an Artist saves profile changes with a mandatory field empty, THEN THE Portal SHALL display a field-level validation error and SHALL NOT persist the changes.
8. THE Portal SHALL display the Artist's Profile as publicly visible immediately after changes are saved.

---

### Requirement 4: Public Artist Portfolio Browsing

**User Story:** As a Visitor, I want to browse artist profiles, so that I can discover Carnatic musicians based in The Netherlands.

#### Acceptance Criteria

1. THE Portal SHALL provide a publicly accessible artist directory page listing all approved Artists.
2. WHEN a Visitor views the artist directory, THE Portal SHALL display each Artist's profile card showing their name, profile photo, and primary Speciality or Specialities.
3. WHEN a Visitor selects an Artist's profile card, THE Portal SHALL display the full Profile page for that Artist.
4. THE Artist Profile page SHALL present the Artist's name, profile photo, optional background image, Specialities, biographical write-up, and any public external links.
5. THE Portal SHALL apply a distinct visual theme (solid or gradient colour scheme) to each Artist's Profile page and profile card based on the Artist's primary Speciality, so that Artists with different Specialities are visually distinguishable.
6. WHERE an Artist has multiple Specialities, THE Portal SHALL apply a blended or multi-tone colour theme that reflects all listed Specialities.
7. THE Portal SHALL render Artist Profile pages with a layout optimised for mobile screens first, scaling gracefully to tablet and desktop viewports.
8. THE Portal SHALL load the artist directory page with an initial visible set of profiles within 2 seconds on a standard 4G mobile connection.
9. THE Portal SHALL support lazy loading of additional Artist profiles as the Visitor scrolls the directory page.

---

### Requirement 5: Speciality-Based Visual Theming

**User Story:** As a Visitor or Artist, I want each artist's profile to be visually themed by their speciality, so that I can quickly identify what kind of musician they are.

#### Acceptance Criteria

1. THE Portal SHALL maintain a Speciality colour palette that assigns a unique primary colour to each recognised Speciality (e.g., Vocal, Violin, Mridangam, Veena, Flute, Ghatam, Kanjira, Thavil, Nadaswaram, and others).
2. WHEN a Profile page is rendered, THE Portal SHALL apply the Speciality colour palette to the profile header, accent elements, and profile card background using solid or fading (gradient) colour fills.
3. WHERE an Artist has a single Speciality, THE Portal SHALL apply that Speciality's primary colour as the dominant theme.
4. WHERE an Artist has multiple Specialities, THE Portal SHALL apply a gradient blending the primary colours of all listed Specialities.
5. THE Portal SHALL ensure that text rendered over Speciality colour backgrounds meets a minimum contrast ratio of 4.5:1 to satisfy accessibility requirements.

---

### Requirement 6: Availability Calendar

**User Story:** As an Artist, I want to mark my availability on a calendar, so that other artists can see when I am free to collaborate.

#### Acceptance Criteria

1. WHEN an authenticated Artist accesses their profile management interface, THE Portal SHALL provide an Availability Calendar where the Artist can mark specific dates or date ranges as available.
2. THE Availability Calendar SHALL allow the Artist to add, edit, and remove availability entries.
3. WHEN an Artist marks a date range as available, THE Portal SHALL persist the availability data and reflect it on the Artist's public Profile page.
4. THE Artist's public Profile page SHALL display the Artist's availability in a calendar view visible to all Visitors and Artists.
5. WHEN an Artist removes an availability entry, THE Portal SHALL update the public Profile page to no longer show that date range as available.

---

### Requirement 7: Artist Search

**User Story:** As a logged-in Artist, I want to search for other artists using a simple search form, so that I can find collaborators matching specific instrument type and availability dates.

#### Acceptance Criteria

1. THE Portal SHALL provide an Artist Search interface accessible only to authenticated Artists.
2. THE Artist Search interface SHALL provide a free-text search field that filters Artists by name.
3. THE Artist Search interface SHALL provide a Speciality dropdown that lists all Specialities present in the current artist database, allowing the user to filter by one Speciality at a time.
4. THE Speciality dropdown SHALL support typeahead filtering - as the user types into the dropdown input, the list of displayed Speciality options SHALL narrow to those matching the typed characters.
5. THE Speciality dropdown options SHALL be derived dynamically from the Specialities of currently approved Artists, so that only Specialities with at least one approved Artist are shown.
6. THE Artist Search interface SHALL provide an optional start date field and an optional end date field, allowing the user to filter Artists whose Availability Calendar overlaps with the specified date range.
7. WHEN a user submits the search form, THE Portal SHALL return a list of approved Artists whose name matches the free-text field (if provided), whose Specialities include the selected Speciality (if selected), and who have at least one Availability Calendar entry overlapping the specified date range (if dates are provided).
8. WHEN no search criteria are provided, THE Portal SHALL return all approved Artists.
9. WHEN no Artists match the search criteria, THE Portal SHALL display a message indicating no results were found.
10. THE Artist Search interface SHALL display search results within 1 second of form submission under normal load conditions.
11. All search filtering SHALL be performed server-side using database queries with no external API calls.

---

### Requirement 8: Collab (Group Chat) Creation and Management

**User Story:** As an Artist, I want to create and manage group chats for upcoming collaborations, so that I can coordinate with other artists efficiently.

#### Acceptance Criteria

1. THE Portal SHALL allow authenticated Artists to create a new Collab by providing a Collab name and an optional description.
2. WHEN an Artist creates a Collab, THE Portal SHALL designate that Artist as the Collab owner.
3. THE Collab owner SHALL be able to add or remove other Artists from the Collab.
4. WHEN an Artist is added to a Collab, THE Portal SHALL notify that Artist via an in-Portal notification.
5. THE Portal SHALL allow any Collab member to send text messages within the Collab.
6. THE Collab owner SHALL be able to edit the Collab name and description.
7. THE Collab owner SHALL be able to delete the Collab, which SHALL remove all associated messages and member associations.
8. THE Portal SHALL allow any Collab member to leave the Collab voluntarily.
9. THE Portal SHALL display the list of active Collabs to each authenticated Artist who is a member of those Collabs.

---

### Requirement 9: Collab Lifecycle Management

**User Story:** As an Artist, I want to mark a collab's outcome when it concludes, so that the collaboration history is accurately recorded.

#### Acceptance Criteria

1. THE Collab owner SHALL be able to close a Collab by setting its status to one of: Completed, Completed via Other Channels, or Incomplete.
2. WHEN a Collab owner sets the status to Completed, THE Portal SHALL optionally allow the owner to attach or link an audio or video recording representing the collaboration outcome before closing.
3. WHEN a Collab is closed with any status, THE Portal SHALL mark the Collab as inactive and prevent new messages from being sent.
4. WHEN a Collab is closed with status Completed or Completed via Other Channels, THE Portal SHALL prompt each Collab member to leave Feedback for other members they collaborated with.
5. IF a Collab is closed with status Incomplete, THEN THE Portal SHALL NOT prompt members for Feedback.
6. THE Portal SHALL retain closed Collab history (messages, status, outcome media link) and make it accessible to Collab members and Admins.

---

### Requirement 10: Admin Chat Moderation

**User Story:** As an Admin, I want to monitor group chats, so that I can ensure the platform remains safe and free of spam or anti-social content.

#### Acceptance Criteria

1. THE Admin Dashboard SHALL provide a Collab moderation view listing all active and closed Collabs.
2. WHEN an Admin selects a Collab in the moderation view, THE Admin Dashboard SHALL display the full message history of that Collab.
3. THE Portal SHALL display a visible notice to all Collab members stating that Admins can view Collab message history.
4. THE Admin Dashboard SHALL allow an Admin to delete individual messages from a Collab.
5. THE Admin Dashboard SHALL allow an Admin to close a Collab and set its status to Incomplete if the content is deemed inappropriate.
6. THE Admin Dashboard SHALL allow an Admin to suspend an Artist account, which SHALL prevent the Artist from sending messages or creating new Collabs.

---

### Requirement 11: Artist Feedback System

**User Story:** As an Artist, I want to leave feedback for artists I have collaborated with, so that the community can build trust and recognise quality musicians.

#### Acceptance Criteria

1. WHEN a Collab is closed with status Completed or Completed via Other Channels, THE Portal SHALL allow each Collab member to submit Feedback for each other member of that Collab. The Feedback form SHALL require a star rating (1–5 stars, mandatory) and SHALL optionally accept a written comment (rich text, not required).
2. THE Feedback form SHALL require a star rating of 1 to 5 stars (mandatory). A written comment SHALL be optional (rich text field, may be left blank).
3. WHEN an Artist submits Feedback, THE Portal SHALL associate the Feedback with both the reviewer Artist and the reviewed Artist, and with the originating Collab.
4. THE Portal SHALL display received Feedback on the reviewed Artist's public Profile page.
5. THE Portal SHALL allow each Artist to submit Feedback for a given Collab member only once per Collab.
6. IF an Artist attempts to submit Feedback for the same Collab member more than once for the same Collab, THEN THE Portal SHALL reject the duplicate submission and display an informational message.
7. THE Portal SHALL allow an Artist to edit their submitted Feedback within 7 days of submission.

---

### Requirement 12: Authentication and Session Management

**User Story:** As an Artist, I want to securely log in and maintain my session, so that I can access my profile and collaboration tools without repeatedly authenticating.

#### Acceptance Criteria

1. THE Portal SHALL authenticate Artists exclusively via Login Links sent to their registered email address (magic link authentication).
2. WHEN an authenticated Artist requests a new Login Link, THE Portal SHALL send a new Login Link to the Artist's registered email address and invalidate any previously issued unused Login Links for that Artist.
3. THE Portal SHALL maintain an authenticated session for an Artist for up to 30 days without requiring re-authentication, provided the session is active.
4. WHEN an Artist's session expires or the Artist logs out, THE Portal SHALL redirect the Artist to the public home page.
5. THE Portal SHALL provide a logout option accessible from all authenticated pages.

---

### Requirement 13: Progressive Web App (PWA) and Mobile-First Design

**User Story:** As an Artist or Visitor, I want to use the Portal on my mobile device with a native-app-like experience, so that I can access it conveniently on the go.

#### Acceptance Criteria

1. THE Portal SHALL be implemented as a Progressive Web App, providing an installable experience on iOS and Android devices.
2. THE Portal SHALL include a Web App Manifest with an app name, icons, theme colour, and display mode set to standalone.
3. THE Portal SHALL register a Service Worker that caches the application shell and static assets for offline access.
4. WHILE the device is offline, THE Portal SHALL display cached Artist profiles that were previously loaded, with a visible offline indicator.
5. THE Portal SHALL use a mobile-first responsive layout where all interactive elements have a minimum touch target size of 44×44 CSS pixels.
6. THE Portal SHALL achieve a Lighthouse PWA score of 90 or above on a standard mobile device profile.
7. THE Portal SHALL support push notifications for in-Portal events (new Collab invitation, new Feedback received) on devices where push notification permission has been granted by the Artist.

---

### Requirement 14: Performance and Accessibility

**User Story:** As a Visitor or Artist, I want the Portal to load quickly and be accessible, so that I can use it regardless of device capability or accessibility need.

#### Acceptance Criteria

1. THE Portal SHALL achieve a Lighthouse Performance score of 85 or above on a standard mobile device profile.
2. THE Portal SHALL achieve a Lighthouse Accessibility score of 90 or above.
3. THE Portal SHALL provide descriptive alt text for all images, including profile photos and background images.
4. THE Portal SHALL ensure all interactive controls are operable via keyboard navigation.
5. THE Portal SHALL use semantic HTML elements for headings, navigation, lists, and form controls.
6. THE Portal SHALL support right-to-left text rendering for any content that may include Tamil or other RTL-adjacent scripts, where applicable.
7. WHEN a page is navigated to, THE Portal SHALL update the browser document title and meta description to reflect the current page content for search engine discoverability.

---

### Requirement 15: Portal Home Page

**User Story:** As a Visitor or Artist, I want to see a rich, informative home page when I arrive at the Portal, so that I can immediately understand the community's size, activity, and discover featured artists.

#### Acceptance Criteria

1. THE Portal SHALL provide a publicly accessible home page as the default landing page at the root URL.
2. THE Portal SHALL display the total count of approved, registered Artists on the home page.
3. WHEN the total Artist count is displayed, THE Portal SHALL reflect the current count at the time of page load, updated in real time as new Artists are approved.
4. THE Portal SHALL display the count of Artists who are actively seeking collaboration on the home page, defined as Artists who have at least one future availability entry on their Availability Calendar.
5. WHEN the actively-seeking-collaboration count is displayed, THE Portal SHALL reflect the current count at the time of page load.
6. THE Portal SHALL display a map of The Netherlands on the home page, showing the number of registered Artists per province.
7. WHEN the Netherlands map is rendered, THE Portal SHALL display each province with a visual indicator (e.g., colour intensity or numeric label) proportional to the Artist count in that province.
8. WHEN a province on the map has zero registered Artists, THE Portal SHALL render that province in a neutral style distinct from provinces with at least one Artist.
9. THE Portal SHALL display an "Instrumentalist of the Day" feature on the home page, showcasing a randomly selected Artist whose primary Speciality is an instrument (i.e., not Vocal).
10. WHEN the "Instrumentalist of the Day" is displayed, THE Portal SHALL show the featured Artist's name, profile photo, and a link to their full Profile page.
11. THE Portal SHALL rotate the "Instrumentalist of the Day" selection once every 24 hours, so that a different instrumentalist Artist is featured each calendar day.
12. THE Portal SHALL display a "Singer of the Day" feature on the home page, showcasing a randomly selected Artist whose primary Speciality is Vocal.
13. WHEN the "Singer of the Day" is displayed, THE Portal SHALL show the featured Artist's name, profile photo, and a link to their full Profile page.
14. THE Portal SHALL rotate the "Singer of the Day" selection once every 24 hours, so that a different vocalist Artist is featured each calendar day.
15. WHEN the "Instrumentalist of the Day" or "Singer of the Day" selection is rotated, THE Portal SHALL ensure the newly selected Artist is different from the Artist featured on the immediately preceding day, provided more than one eligible Artist exists.
16. IF no eligible instrumentalist Artists exist at rotation time, THEN THE Portal SHALL display a placeholder message in the "Instrumentalist of the Day" section indicating no instrumentalist is currently available.
17. IF no eligible vocalist Artists exist at rotation time, THEN THE Portal SHALL display a placeholder message in the "Singer of the Day" section indicating no singer is currently available.
18. THE Portal SHALL persist the daily featured Artist selections so that all Visitors and Artists see the same "Instrumentalist of the Day" and "Singer of the Day" for a given calendar day, regardless of when they load the page.

---

### Requirement 16: Multi-Region Extensibility

**User Story:** As a deployment operator, I want to configure the Portal for a new country or region without code changes, so that the platform can be extended to new markets by supplying configuration and data rather than modifying the application.

#### Acceptance Criteria

1. THE Portal SHALL read all deployment-specific settings (country or region name, locale, map data source, supported UI languages, and portal branding) from a deployment-level configuration file or environment variables, with no values hard-coded in application source code.
2. WHEN the Portal is initialised, THE Portal SHALL load the geographic map data from the configurable map data source specified in the deployment configuration (e.g., a GeoJSON file describing the country's administrative regions).
3. WHERE a new deployment supplies a replacement GeoJSON file for a different country's administrative regions, THE Portal SHALL render the home page map using that file without requiring any application code changes.
4. THE Portal SHALL derive the list of UI languages presented to users exclusively from the deployment configuration, so that adding or removing a supported language requires only a configuration change.
5. THE Portal SHALL apply the portal name and branding assets (logo, colour palette overrides) specified in the deployment configuration to all pages.
6. WHERE the deployment configuration designates The Netherlands as the target region, THE Portal SHALL list English (EN) as the primary UI language and Dutch (NL) as the secondary UI language.
7. THE Portal SHALL treat each deployment as an independent instance; no cross-deployment data sharing or multi-tenancy architecture is required.

---

### Requirement 17: UI Language Localisation

**User Story:** As a Visitor or Artist, I want to use the Portal in my preferred language, so that I can navigate and interact with the platform in a language I am comfortable with.

#### Acceptance Criteria

1. THE Portal SHALL externalise all user-facing text - including navigation labels, button labels, form field labels and placeholders, validation messages, error messages, notification text, and system-generated messages - into locale-specific translation files (e.g., JSON files), so that no UI string is hard-coded in application source code.
2. THE Portal SHALL support all UI languages listed in the deployment configuration and SHALL NOT display untranslated strings to users when a translation exists for the active locale.
3. THE Portal SHALL display a language switcher control accessible from every page, allowing the user to change the active UI language at any time.
4. WHEN a user selects a UI language via the language switcher, THE Portal SHALL persist the selected language preference for the duration of the browser session and SHALL restore it on subsequent visits from the same browser.
5. WHERE the deployment configuration designates The Netherlands as the target region, THE Portal SHALL default to English (EN) as the active UI language for new sessions and SHALL offer Dutch (NL) as an alternative via the language switcher.
6. THE Portal SHALL format dates, times, and numbers according to the conventions of the active locale (e.g., DD-MM-YYYY date format for NL locale, comma as decimal separator where applicable).
7. THE Portal SHALL allow non-developer contributors to update or add translations by editing the external translation files without modifying application source code.

---

### Requirement 18: Indic Script and Multilingual Content Support

**User Story:** As an Artist, I want to write my bio, chat messages, and feedback in any Indic script or combination of scripts, so that I can express myself authentically in my native language without restriction.

#### Acceptance Criteria

1. THE Portal SHALL accept and correctly store Unicode text in all Indic scripts - including Tamil, Kannada, Telugu, Malayalam, Devanagari (Hindi and Sanskrit), and other Unicode-encoded scripts - in all user-generated content fields: biographical write-up, Collab chat messages, and Feedback comments.
2. THE rich text editor used for the biographical write-up SHALL support direct Unicode keyboard input for all Indic scripts without stripping, corrupting, or substituting characters.
3. WHEN Indic script text is stored and subsequently retrieved, THE Portal SHALL render the text with the same Unicode code points as originally submitted, with no character loss or substitution.
4. THE Portal SHALL load and apply high-quality web fonts (e.g., the Google Fonts Noto family or equivalent) that provide full glyph coverage for Tamil, Kannada, Telugu, Malayalam, Devanagari, and other Indic scripts used in user-generated content.
5. WHEN a page containing Indic script content is rendered, THE Portal SHALL display all glyphs legibly with no missing-glyph placeholder boxes (tofu), provided the script is covered by the loaded web fonts.
6. WHEN a content block contains mixed-script text (e.g., English followed by Tamil followed by Malayalam within the same paragraph), THE Portal SHALL render each script segment using an appropriate font without layout breaks or glyph substitution errors.
7. THE Portal SHALL load Indic script web fonts using a font-display strategy of swap or equivalent, so that font loading does not block page rendering or degrade Lighthouse Performance scores.
8. THE Portal SHALL set the appropriate Unicode language attribute (lang) on rendered user-generated content elements so that browsers and screen readers apply correct script shaping and text-to-speech handling.
9. THE Portal SHALL impose no restriction on which script or language an Artist uses in their biographical write-up, Collab chat messages, or Feedback comments; the platform SHALL treat all Unicode scripts equally for user-generated content.

---

### Requirement 19: Admin Core Metadata Management

**User Story:** As an Admin, I want to create, read, update, and delete core platform data (specialities, artist profiles, and collabs), so that I can maintain the integrity and accuracy of the platform without needing direct database access.

#### Acceptance Criteria

**Speciality management:**
1. THE Admin Dashboard SHALL provide a Speciality management interface listing all Specialities with their name, primary colour, and text colour.
2. THE Admin Dashboard SHALL allow an Admin to create a new Speciality by providing a name, primary colour (hex), and contrast-safe text colour (hex).
3. WHEN an Admin creates a Speciality with a name that already exists, THE Portal SHALL reject the creation and display a duplicate-name error.
4. THE Admin Dashboard SHALL allow an Admin to update the name, primary colour, and text colour of an existing Speciality.
5. THE Admin Dashboard SHALL allow an Admin to delete a Speciality, provided no Artist is currently associated with that Speciality. IF one or more Artists are associated with the Speciality, THE Portal SHALL reject the deletion and display an informational message listing the number of affected Artists.

**Artist management:**
6. THE Admin Dashboard SHALL provide an Artist management interface listing all approved Artists with their name, email, province, specialities, and account status (active or suspended).
7. THE Admin Dashboard SHALL allow an Admin to edit any field on an Artist's profile, subject to the same mandatory-field and speciality-count (1–3) validation rules that apply to artist self-editing.
8. THE Admin Dashboard SHALL allow an Admin to delete an Artist account, which SHALL also delete all associated availability entries, external links, and speciality associations. Collabs owned by the deleted Artist SHALL be transferred to Admin ownership or closed as Incomplete.
9. WHEN an Admin deletes an Artist account, THE Portal SHALL display a confirmation prompt before proceeding.

**Collab management:**
10. THE Admin Dashboard SHALL provide a Collab management interface listing all Collabs (active and closed) with their name, owner, member count, status, and creation date.
11. THE Admin Dashboard SHALL allow an Admin to edit the name and description of any Collab.
12. THE Admin Dashboard SHALL allow an Admin to close any active Collab and set its status to Incomplete.
13. THE Admin Dashboard SHALL allow an Admin to permanently delete a Collab, which SHALL remove all associated messages and member associations. THE Portal SHALL display a confirmation prompt before proceeding.
14. THE Admin Dashboard SHALL allow an Admin to add or remove members from any active Collab.
