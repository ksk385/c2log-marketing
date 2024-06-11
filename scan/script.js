document.addEventListener("DOMContentLoaded", function () {
  function showResult(response, packageNdc) {
    if (response.status !== 200) {
      console.error(`Failed to fetch data: ${response.statusText}`);
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    } else {
      response.json().then((data) => {
        const result = data.results[0];
        if (result) {
          const productName = result.brand_name;
          const deaSchedule = result.dea_schedule;
          const manufacturer = result.openfda.manufacturer_name;
          const dosageForm = result.dosage_form;
          const package = result.packaging.find(
            (package) => package.package_ndc === packageNdc
          );
          const activeIngredients = result.active_ingredients.reduce(
            (acc, ingredient) => {
              acc.push(`${ingredient.name} ${ingredient.strength}`);
              return acc;
            },
            []
          );
          $("#result").append(
            `<div class="result-header">Results:</div>
            <div class="result-grid">
              <div>Package NDC</div><div>${package.package_ndc}</div>
              <div>Product Name</div><div>${productName}</div>
              <div>DEA Schedule</div><div>${deaSchedule}</div>
              <div>Manufacturer</div><div>${manufacturer}</div>
              <div>Dosage Form</div><div>${dosageForm}</div>
              <div>Active Ingredients</div><div>${activeIngredients}</div>
              <div>Package Description</div><div>${package.description}</div>
          </div>`
          );
        }
      });
    }
  }
  function callAPI(code) {
    // Drop package code from 10 digit ndc
    console.log(`Formatted Code: ${code}`);
    //const ndc = code.slice(0, -3);
    const ndc = code;
    console.log(`Calling API with NDC: ${ndc}`);
    const apiUrl = `https://api.fda.gov/drug/ndc.json?search=packaging.package_ndc:${ndc}`;
    //const apiUrl = `https://api.fda.gov/drug/ndc.json?search=product_ndc:${ndc}`;
    return fetch(apiUrl);
  }

  function onScanSuccess(decodedText, decodedResult) {
    // Pause Scanning
    if (html5QrcodeScanner.getState() === Html5QrcodeScannerState.SCANNING) {
      html5QrcodeScanner.pause(true);
    }
    // Hide the scanner and show the start button
    $("#reader").hide();
    html5QrcodeScanner.clear();
    $("button#start").show();

    // handle the scanned code:
    let tenDigitCode;
    console.log(`Code matched = ${decodedText}`, decodedResult);
    if (
      decodedResult.result.format.format === Html5QrcodeSupportedFormats.UPC_A
    ) {
      tenDigitCode = decodedText.slice(1, -1);
    } else if (
      decodedResult.result.format.format === Html5QrcodeSupportedFormats.EAN_13
    ) {
      tenDigitCode = decodedText.slice(2, -1);
    } else {
      console.error("Invalid format");
      $("#result").text("Invalid barcode format");
      return;
    }
    console.log(`Ten Digit Code: ${tenDigitCode}`);
    let formattedCode;
    // Add hyphens at 4-4-2 format
    formattedCode = `${tenDigitCode.slice(0, 4)}-${tenDigitCode.slice(
      4,
      8
    )}-${tenDigitCode.slice(8, 10)}`;

    callAPI(formattedCode)
      .then((response) => showResult(response, formattedCode))
      .catch((error) => {
        console.warn(
          `4-4-2 format failed: ${error}. Attempting other formats...`
        );
        // Add hyphens at 5-3-2 format
        formattedCode = `${tenDigitCode.slice(0, 5)}-${tenDigitCode.slice(
          5,
          8
        )}-${tenDigitCode.slice(8, 10)}`;
        callAPI(formattedCode)
          .then((response) => showResult(response, formattedCode))
          .catch((error) => {
            console.warn(
              `5-3-2 format failed: ${error}. Attempting other formats...`
            );
            // Add hyphens at 5-4-1 format
            formattedCode = `${tenDigitCode.slice(0, 5)}-${tenDigitCode.slice(
              5,
              9
            )}-${tenDigitCode.slice(9, 10)}`;
            callAPI(formattedCode)
              .then((response) => showResult(response, formattedCode))
              .catch((error) => {
                console.error(`5-4-1 format also failed: ${error}. Giving up!`);
                $("#result").text(
                  "Failed to fetch NDC data. Please try again later."
                );
              });
          });
      });
  }

  function onScanFailure(error) {
    // handle scan failure, usually better to ignore and keep scanning.
    // for example:
    console.warn(`Code scan error = ${error}`);
    $("#result").text(`Failed to scan code. Please try again. ${error}`);
  }
  let html5QrcodeScanner = new Html5QrcodeScanner(
    "reader",
    {
      fps: 10,
      qrbox: { width: 600, height: 250 },
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.UPC_A,
      ],
    },
    /* verbose= */ true
  );
  const scanner = $("#reader");
  const startButton = $("button#start");
  const result = $("#result");
  $("button#start").on("click", (event) => {
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    result.text("");
    scanner.show();
    startButton.hide();
  });
});
