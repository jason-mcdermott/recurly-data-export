# recurly-data-export
Download Recurly data using Node.js

  * You will need to update the config.js with:
    * your Recurly private API_KEY. Note that it should be Base64-encoded.
    * API version (currently 2.5)
    * your Recurly domain (e.g., "[domain_name].recurly.com")
    
  * Can be run with a date parameter: `node app "2018-08-01"` or just `node app` and it will use today's date.
    
