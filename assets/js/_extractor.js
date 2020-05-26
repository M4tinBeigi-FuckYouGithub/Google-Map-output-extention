var searchURL = /^https:\/\/www.google.[a-z]+\/search\/*/,
    gmRegex = /^https:\/\/www.google.[a-z]+\/maps\/*/,
    googleResults = []
    , businesses = []
    , collectedFlag = false
    , lastURL = '';

function addToCollection(url, data)
{
  collectedFlag = true;
  var filteredData = JSON.parse(data.slice(0, -6)).d;
  var ew = filteredData.substr(4);
  googleResults[url] = ew;

  readCollection();
  sendCollectionToLocalStorage();
}

function readCollection()
{
  for (var key in googleResults)
  {
    var data = JSON.parse(googleResults[key])[0][1];

    var amount = data.length;
    for (i = 0; i < amount; i++)
    {
      if (data[i].length == 15)
      {
          var url = null
            , domain = null
            , claimed_google_my_business = "Yes"
            , count_reviews = 0
            , average_rating = 0;
            console.log(data[i][14])

          if(data[i][14][49] !== null)
          {
            claimed_google_my_business = "No";
          }

          if(data[i][14][4] !== null)
          {
            count_reviews = data[i][14][4][8];
            average_rating = data[i][14][4][7];
          }

          if(data[i][14][7] !== null)
          {
            url = data[i][14][7][0];
            domain = data[i][14][7][1];
          }

          var adres = ' '
            , municipality = ' '
            , area = ' '
            , placeLength = data[i][14][2];

          if (placeLength !== null)
          {
            placeLength = placeLength.length;
            if (placeLength == 2)
            {
                adres = data[i][14][2][0].replace(',', ' ');
                municipality = data[i][14][2][1].replace(',', ' ');
            }
            else if (placeLength === 3)
            {
                adres = data[i][14][2][0].replace(',', ' ');
                area = data[i][14][2][1].replace(',', ' ');
                municipality = data[i][14][2][2];
            }
            else if (placeLength === 4)
            {
                adres = data[i][14][2][0].replace(',', ' ');
                municipality = data[i][14][2][1];
            }
            else
            {
                municipality = data[i][14][2][0].replace(',', ' ');
            }
          }
          else
          {
            placeLength = 0;
            municipality = ' ';
          }

          var fulladdress = ' ';
          if (data[i][14][39] !== null)
          {
              fulladdress = data[i][14][39].replace(',', ' ');
              fulladdress = fulladdress.replace(',', ' ');
          }

          var name = data[i][14][11];
          name = name.replace(',', ' ');

          var values = {
            'name': name.replace(',', ' '),
            'fulladdress': fulladdress.replace(',', ' '),
            'street': adres.replace(',', ' '),
            'area': area,
            'municipality': municipality.replace(',', ' '),
            'phone 1': data[i][14][3],
            'phone 2': data[i][14][90],
            'email': ' ',
            'website': url,
            'domain': domain,
            'facebook_url': ' ',
            'linkedin_url': ' ',
            'twitter_url': ' ',
            'instagram_url': ' ',
            'youtube_url': ' ',
            'claimed_google_my_business': claimed_google_my_business,
            'count_reviews': count_reviews,
            'average_rating': average_rating,
            'latitude': 'Lat '+data[i][14][9][2].toString(),
            'longitude': 'Lng '+data[i][14][9][3].toString(),
            'facebook pixel': ' ',
            'google tag manager': ' ',
            'google analytics': ' ',
          };

          businesses.push(values);
      }
    }
  }
}

function sendCollectionToLocalStorage()
{
  localStorage.setItem('bg_businesses_temp', JSON.stringify(_.uniqBy(businesses, 'name')));
  chrome.runtime.sendMessage({
      action: "fetched",
  });
}

document.addEventListener('DOMContentLoaded', function() {
  chrome.webRequest.onCompleted.addListener((details) =>
  {
    if (searchURL.test(details.url))
    {
      const url = details.url;

      if (lastURL !== url)
      {
        lastURL = url;
          fetch(url)
            .then(
                response => response.text()
            ).then(function(html) {
              addToCollection(url, html)
            });
      }
    }
  },{
    urls: ['<all_urls>'],
    types: ["xmlhttprequest"]
  },[]);
});
