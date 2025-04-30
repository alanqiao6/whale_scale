WhaleScale – RELEASE_NOTES.md
===============================

Version: Final Submission  
Release Date: April 30, 2025


🧩 CURRENT FUNCTIONALITY
-------------------------
WhaleScale is a web-based tool for measuring and analyzing whale dimensions from aerial imagery. The following features are included in this release:

- ✅ Upload images in JPG, PNG, HEIC, or WEBP formats
- ✅ Automatically extract embedded metadata using Collatrix
- ✅ Interactively place and move crosshairs along the whale body to calculate **total length** and **segment widths**
- ✅ Calculate **body condition** and **estimated volume**
- ✅ Draw straight-line measurements using a **line tool**
- ✅ Measure enclosed areas using the **area tool**
- ✅ Measure angles using the **angle tool**
- ✅ Export collected measurement data for external analysis
- ✅ User **login system** for saving or tracking data
- ✅ App is also **fully usable without login**


🐞 KNOWN BUGS / INCOMPLETE FEATURES
-----------------------------------
- **Xcertainty** integration is not fully implemented in this version; Starter code is in whale_scale/MMI_CODEX/xcertainty, though it may not work as intended. Measurement uncertainty is not currently visualized.
- Image scaling for screen viewing is not perfect. Certain image sizes may result in stretching images, causing incorrect measurement values.


⚠️ ASSUMPTIONS & LIMITATIONS
-----------------------------
- Measurement accuracy depends on user precision in placing crosshairs.
- While the app does not assume high-quality drone imagery, higher-resolution images offer better on-screen visualization and more accurate tracing.
- No backend image validation beyond file type; malformed metadata may not be parsed correctly.
- No persistent user storage or session history beyond login (on production branch).
- Anyone can create a new account without limitations. In the real world, this could be an issue, especially if storing user images.


🧪 PLATFORMS TESTED
--------------------
- ✔️ Google Chrome (latest)
- ✔️ Safari (latest)
- ✔️ Mobile browsers (iOS Safari, Android Chrome)

Tested across macOS and iOS devices.

WHAT EXISTS ON DEV THAT ISN'T ON PROD?
--------------------------------------
- Updated frontend with better image viewing that scales to fit your screen
- More modular frontend buit to accomodate future XCertainty integration
- More accurate MorphometriX values
- MorphometriX allows user to input "Altitude Offset", which is added to the altitude data. This represents launch height for more accurate altitude.
- Database that stores user data. Note, this does not include the actual image files, as 8k we did not have the space available to support storage of 8k resolution images, especially without any limitations to who can sign up.
- View for seeing user data in a table view (separate tables for morphometrix and body condition). Table rows can be toggled for computation or export, and columns can be toggles for visibility.
- User can delete or modify stored data, and users have the ability to include new metrics such as group name, whale age, actual measurement, etc.
- Error checking for body condition inputs
- Frontend framework for incorporating XCertainty. The intention was for the DataSidebar.js dropdown to include options for various XCertainty related tasks. Then, the submit button could be used to make a request to the XCertainty backend endpoints with the selected data from the table.

DEV BUGS:
- After running the body condition calculation, click to the measure tab and back to refresh the body condition table to include the new data.
- Only authenticated users can make measurements or store data, however, there is no warning to the user that this is the case.