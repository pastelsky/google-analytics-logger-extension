<div align="center">
  <img src="https://s14.postimg.org/clr1cwkup/icon-128.png" width="160"/>
  <h1>
    Google Analytics Logger 
  </h1>
</div>

A WIP browser [WebExtension](https://developer.mozilla.org/en-US/Add-ons/WebExtensions) that provides accurate logging for Google Analytics events.

## Features

- Supports page views, interaction events, [user timing](https://developers.google.com/analytics/devguides/collection/analyticsjs/user-timings), [social interactions](https://developers.google.com/analytics/devguides/collection/analyticsjs/social-interactions) and [exception events](https://developers.google.com/analytics/devguides/collection/analyticsjs/exceptions).
- Works with legacy Google Analytics as well
- Supports Google Analytics events fired through Google Tag Manager.
- Warns if sending of event failed (due to network error / blocking) and if duplicate events are being sent.
- Organises events tab-wise.

## Screenshots
<div align="center">
  <img src="https://s12.postimg.org/cqo4b5y7h/Group_2.png" width="250" />
</div>

## Installation
1. Clone the repository `git clone https://github.com/pastelsky/google-analytics-logger-extension.git`
2. Run `yarn install`
3. Run `yarn run build`


##### Load the extension in Chrome & Opera
1. Open Chrome/Opera browser and navigate to chrome://extensions
2. Select "Developer Mode" and then click "Load unpacked extension..."
3. From the file browser, choose to `extension-boilerplate/build/chrome` or (`extension-boilerplate/build/opera`)


##### Load the extension in Firefox
1. Open Firefox browser and navigate to about:debugging
2. Click "Load Temporary Add-on" and from the file browser, choose `extension-boilerplate/build/firefox`


## Developing
The following tasks can be used when you want to start developing the extension and want to enable live reload - 

- `yarn run chrome-watch`
- `yarn run opera-watch`
- `yarn run firefox-watch`


## Packaging
Run `npm run dist` to create a zipped, production-ready extension for each browser. You can then upload that to the appstore.

-----------
This project is licensed under the MIT license. 

If you have any questions or comments, please create a new issue. I'd be happy to hear your thoughts.
