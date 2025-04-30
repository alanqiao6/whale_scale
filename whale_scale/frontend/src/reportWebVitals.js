/* File: reportWebVitals.test.js
* Authors: Alan Qiao, August Hao, Ciaran Burr, Jason Fitzpatrick
* Purpose: Tests the reportWebVitals utility function to ensure it functions correctly-default with react
*/
const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
