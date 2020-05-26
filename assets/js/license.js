var STRIPE_URL = 'https://api.stripe.com/v1';
var STRIPE_KEY='rk_live_CQBbe0eXWqh859z5h1kMEkRT';
var PROD_STATUS = true;
var PROD_MONTHLY_PLAN = 'plan_Ecp1xdENQliyvF';
var TEST_MONTHLY_PLAN = 'plan_EbKkAXu2hpDjin';
var _STATUS = "";
var PLAN = "";

var customer_data = null;
var invoices_data = null;

function init() {

  if (PROD_STATUS)
  {
    PLAN = PROD_MONTHLY_PLAN;
    //console.log("prod env")
  }
  else
  {
    PLAN = TEST_MONTHLY_PLAN;
    //console.log("test env")
  }
  getCustomerLicense();
}

function getCustomerLicense() {

  if(localStorage.getItem('LastLicenseCall') !== null) {
    //if (daysBetween(new Date(), localStorage.getItem('LastLicenseCall')) <= -1) {
      xhrWithAuth('GET', true, onCustomerFetched);
    //}
  } else {
    xhrWithAuth('GET', true, onCustomerFetched);
  }

}

function onCustomerFetched(error, status, response) {
  try {
    customer_data = JSON.parse(response).data[0];
  }
  catch(err)
  {
    document.getElementById("licenseStatus").innerHTML = "Error - Try again later ";
  }

  if (status === 200)
  {

    if (customer_data)
    {
      getInvoicesByCustomer(customer_data['id']);
    }
    else
    {
      isFree();
    }

  }
  else
  {
    document.getElementById("licenseStatus").innerHTML = "Error - Try again later ";
    localStorage.removeItem('LastLicenseCall');
  }
}

function getLicense() {

  if (!customer_data || !invoices_data) {
    isFree();
    return;
  }

  const active_sub = customer_data['subscriptions']['data'][0];

  if (!active_sub) {
    FailedSoFree("Free to try - License expired, resubscribe please >>");
    return;
  }

  const active_sub_plan = active_sub['plan'];

  var licenseStatus;
  var licenseStatusText;
  var licenseaccessLevel;
  if (active_sub['status'] == 'active' && active_sub_plan['active'] && active_sub_plan['usage_type'] == "licensed")
  {

      if(invoices_data['paid'] === false && invoices_data['amount_remaining'] !== 0)
      {
        FailedSoFree("Free to try - Last invoice not yet paid. ");
        document.getElementById('GetLicense').classList.add("hidden");
        document.getElementById('unlimited-link').classList.add("hidden");
        document.getElementById('unlimited-link').classList.add("hidden");
        document.getElementById('stripe-invoice-pay-link').classList.remove("hidden");
        document.getElementById('stripe-invoice-pay-link').addEventListener("click", openStripesUnpaidVoiceTab);
      }
      else
      {
        licenseStatusText = "PAID - Unlimited Access";
        licenseStatus = "success";
        _STATUS = "FULL";
        localStorage.setItem('LastLicenseCall', new Date());
        document.getElementById("licenseStatus").innerHTML = licenseStatusText;
      }

  }
  else {
    FailedSoFree("Free to try - License expired, resubscribe please >>");
  }

}


function openStripesUnpaidVoiceTab()
{
  chrome.tabs.create({'url': invoices_data['hosted_invoice_url']});
}

function getInvoicesByCustomer(customer_id)
{
    var xhr = new XMLHttpRequest();
    xhr.addEventListener("load", requestCompleteCustomerInvoice);
    xhr.open("GET", STRIPE_URL + "/invoices?customer=" + customer_id);
    xhr.setRequestHeader('Authorization', 'Bearer ' + STRIPE_KEY);
    xhr.send();
}

function requestCompleteCustomerInvoice()
{
    invoices_data = JSON.parse(this.response).data[0];
    getLicense();
}

function isFree()
{
  licenseStatusText = "Free to try version (max 4 results to export) >>";
  licenseStatus = "info";
  _STATUS = "FREE";
  localStorage.setItem('LastLicenseCall', new Date());
  document.getElementById('GetLicense').classList.remove("hidden");
  document.getElementById('unlimited-link').classList.remove("hidden");
  document.getElementById("licenseStatus").innerHTML = licenseStatusText;
}

function FailedSoFree(text)
{
  licenseStatusText = text;
  licenseStatus = "info";
  _STATUS = "FREE";
  localStorage.setItem('LastLicenseCall', new Date());
  document.getElementById('GetLicense').classList.remove("hidden");
  document.getElementById('unlimited-link').classList.remove("hidden");
  document.getElementById("licenseStatus").innerHTML = licenseStatusText;
}

function xhrWithAuth(method, interactive, callback) {
  var retry = true;
  getUserIdentity();

  async function getUserIdentity() {
    const user = await chrome.identity.getProfileUserInfo(function(userInfo) {

      if (userInfo.email !== "" || userInfo.id !== "")
      {
        requestStartGetStripeCustomer(userInfo.email);
      }

    });
  }

  function requestStartGetStripeCustomer(email) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", STRIPE_URL + "/customers?limit=3&email=" + email);
    xhr.setRequestHeader('Authorization', 'Bearer ' + STRIPE_KEY);
    xhr.onload = requestCompleteGetStripeCustomer;
    xhr.send();
  }

  function requestCompleteGetStripeCustomer() {
      callback(null, this.status, this.response);
  }

}

function treatAsUTC(date) {
    var result = new Date(date);
    result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
    return result;
}

function daysBetween(startDate, endDate) {
    var millisecondsPerDay = 24 * 60 * 60 * 1000;
    return (treatAsUTC(endDate) - treatAsUTC(startDate)) / millisecondsPerDay;
}

init();
