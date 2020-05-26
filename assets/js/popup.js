renderIndex();
var gmRegex = /^https:\/\/www.google.[a-z]+\/maps\/*/
  , btnGoogleExport = document.getElementById("btnGoogleExport")
  , btnGoogleClear = document.getElementById("btnGoogleClear")
  , incorrectpageContainer = document.getElementById("incorrect_page")
  , correctpageContainer = document.getElementById("correct_page")
  , gm = !1
  , gmWindowID = null
  , provider = null
  , collection = []
  , lastPaginationCounter = 0
  , MAX_DATA_FREE_VERSION = 99999999;

const results = JSON.parse(localStorage.getItem('bg_businesses_temp'));

if (results !== null)
{
  showLastResults()
}

document.getElementById("cur_version").innerHTML = chrome.runtime.getManifest().version;
getUserIdentity()
async function getUserIdentity() {
  const user = await chrome.identity.getProfileUserInfo(function(userInfo) {

    if (userInfo.email !== "" || userInfo.id !== "")
    {
      chrome.runtime.setUninstallURL("https://www.leads-extractor.com/uninstall-google-maps?email="+userInfo.email);
    } else {
      chrome.runtime.setUninstallURL("https://www.leads-extractor.com/uninstall-google-maps");
    }

  });
}
chrome.runtime.onMessage.addListener(function(a, c, b) {
    if (a.action === "fetched") {
      lastPaginationCounter = a.result;
      showLastResults()
    }
});

function showLastResults()
{
  const results = JSON.parse(localStorage.getItem('bg_businesses_temp'));

  document.getElementById("last_results").innerHTML = "";
  for (var i = 0; i < results.length; i++) {
    var node = document.createElement("LI");
    node.classList.add("list-group-item");
    var textnode = document.createTextNode(results[i].name);
    node.appendChild(textnode);
    document.getElementById("last_results").appendChild(node);

    enrichData(results[i].domain);
  }

  btnGoogleClear.classList.remove("hidden");
  btnGoogleExport.classList.remove("hidden");

  document.getElementById("counterResults").innerHTML = "Amount: " + results.length;

}

chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {

    gm = gmRegex.test(tabs[0].url);

    if (gm) {
      gmWindowID = tabs[0].windowId;
      provider = "googlemaps";
    }
    else {
      incorrectpageContainer.classList.remove("hidden");
    }

    correctpageContainer.classList.remove("hidden");
});

function lastGMTabAndReset() {
  localStorage.removeItem('bg_businesses_temp');
  (function () {
      var bg = chrome.extension.getBackgroundPage();
      bg.googleResults = [];
      bg.businesses = [];
  })();
}

btnGoogleClear.onclick = function() {
  document.getElementById("counterResults").innerHTML = "Amount: " + 0;
  clearLocalStorageCollection()
};

function clearLocalStorageCollection()
{
  document.getElementById("last_results").innerHTML = "";
  localStorage.removeItem('bg_businesses_temp');
  lastGMTabAndReset();
}

btnGoogleExport.onclick = function()
{
  btnGoogleClear.classList.add("hidden");
  btnGoogleExport.classList.add("hidden");
  document.getElementById("counterResults").innerHTML = "";
  const data = JSON.parse(localStorage.getItem('bg_businesses_temp'));
  var max_data = 999999999;

  if (data.length <= 0)
  {
    return;
  }

  "FULL" !== _STATUS && (max_data = MAX_DATA_FREE_VERSION);

  var limitedDataByLicense = data.slice(0, max_data).map(i => {
    return i;
  });
  downloadCSV(limitedDataByLicense)
  clearLocalStorageCollection()
};

function enrichData(url)
{

  if (url === null)
  {
    return;
  }

  if (url === "facebook.com" || url === "instagram.com" || url === "m.facebook.com" || url ==="twitter.com")
  {
    return;
  }

    fetch('https://'+url)
      .then(
        response => response.text()
      ).then(function(html) {
        var extraData = extractSocialMedia(html, url);
        var results = JSON.parse(localStorage.getItem('bg_businesses_temp'));

        if (results === null)
        {
          return;
        }

        var index = results.findIndex(x => x.domain === url);

        let merged = {...results[index], ...extraData};
        results[index] = merged;
        localStorage.setItem('bg_businesses_temp', JSON.stringify(results));
      })
      .catch(function(err) {
        fetch('http://'+url)
          .then(
            response => response.text()
          ).then(function(html) {
            var extraData = extractSocialMedia(html, url);
            var results = JSON.parse(localStorage.getItem('bg_businesses_temp'));

            if (results === null)
            {
              return;
            }

            var index = results.findIndex(x => x.domain === url);

            let merged = {...results[index], ...extraData};
            results[index] = merged;
            localStorage.setItem('bg_businesses_temp', JSON.stringify(results));
          })
          .catch(function(err) {
            //console.log(err)
          });

      });


}

function extractSocialMedia(html, url)
{
  var parser = new DOMParser();
  var website = parser.parseFromString(html, "text/html");
  var linkedin = website.querySelectorAll('a[href*="linkedin"]');
  var fb = website.querySelectorAll('a[href*="facebook"]');
  var twitter = website.querySelectorAll('a[href*="twitter"]');
  var email = website.querySelectorAll('a[href*="mailto"]');
  var instagram = website.querySelectorAll('a[href*="instagram"]');
  var youtube = website.querySelectorAll('a[href*="youtube"]');

  if(linkedin.length > 0) {
    linkedin = linkedin[0].href;
  } else { linkedin = ' ';}

  if(fb.length > 0) {
    fb = fb[0].href;
  } else { fb = ' ';}

  if(twitter.length > 0) {
    twitter = twitter[0].href;
  } else { twitter = ' ';}

  if(instagram.length > 0) {
    instagram = instagram[0].href;
  } else { instagram = ' ';}

  if(youtube.length > 0) {
    youtube = youtube[0].href;
  } else { youtube = ' ';}

  if(email.length > 0) {
    email = (email[0].href).substr(7);
  } else {
    var tempEmail = website.querySelectorAll('a[href*="@'+url+'"]');

    if (tempEmail.length > 0) {
      email = tempEmail[0].href;
    } else {
      email = ' ';
    }
  }

  email = decodeURIComponent(email);
  email = cleanEmailStringFromParameters(email);

  var fbp = checkFbTracking(html);
  var gmtag = checkGTMTracking(html);
  var ga = checkGATracking(html);

  var values = {
    'email': email,
    'facebook_url': fb,
    'linkedin_url': linkedin,
    'twitter_url': twitter,
    'instagram_url': instagram,
    'youtube_url': youtube,
    'facebook pixel': fbp,
    'google tag manager': gmtag,
    'google analytics': ga
  };

  return values;
}

function cleanEmailStringFromParameters(string)
{
  var i = string.indexOf("?");

  if (i === -1)
  {
    return string;
  }

  return string.substring(i, 0);
}

function convertArrayOfObjectsToCSV(a) {
    var c;
    var b = a.data || null;
    if (null == b || !b.length)
        return null;
    var e = a.columnDelimiter || ",";
    var f = a.lineDelimiter || "\n";
    var g = Object.keys(b[0]);
    var d = "";
    d += g.join(e);
    d += f;
    b.forEach(function(a) {
        c = 0;
        g.forEach(function(b) {
            0 < c && (d += e);
            d = null != a[b] ? d + a[b] : d + "";
            c++
        });
        d += f
    });
    return d
}
function downloadCSV(a) {
    var c = convertArrayOfObjectsToCSV({
        data: a
    });
    if (null != c) {
        a = provider + "_leads.csv";
        blob = new Blob([c], {type: 'text/csv'});
        var b = document.createElement("a");
        b.setAttribute("id", "btnDownload");
        b.setAttribute("class", "btn btn-success");
        b.setAttribute("href", window.URL.createObjectURL(blob));
        b.setAttribute("download", a);
        document.getElementById("correct_page").appendChild(b);
        document.getElementById("btnDownload").innerHTML = "Download Results (as .CSV)";
    }
}
function checkFbTracking(html) {
  var val1 = html.indexOf("fbq");
  var val2 = html.indexOf("connect.facebook");

  if (val1 >= 0 || val2 >= 0) {
    return 'Yes';
  } else {
    return 'No'
  }
}
function checkGTMTracking(html) {
  var val1 = html.indexOf("gtag");
  var val2 = html.indexOf("googletagmanager.com/gtm.js");

  if (val1 >= 0 || val2 >= 0) {
    return 'Yes';
  } else {
    return 'No'
  }
}
function checkGATracking(html) {
  var val1 = html.indexOf("_gaq");
  var val2 = html.indexOf("google-analytics.com/analytics.js");

  if (val1 >= 0 || val2 >= 0) {
    return 'Yes';
  } else {
    return 'No'
  }
}
;document.addEventListener('DOMContentLoaded', function() {
    var links = document.getElementsByTagName("a");
    for (var i = 0; i < links.length; i++) {
        (function() {
            var ln = links[i];
            var location = ln.href;
            ln.onclick = function() {
                chrome.tabs.create({
                    active: true,
                    url: location
                });
            }
            ;
        }
        )();
    }
});
