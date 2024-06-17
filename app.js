// Global vars

let global_master_json_restructured;
let table_headers_options_arr = [
  "Date",
  "Time",
  "Instrument",
  "Order type",
  "Buy Quant.",
  "Buy Price",
  "Real. Quant.",
  "Sell Price",
  "Unreal. Quant.",
  "Adj Buy Avg",
  "P/L",
  "Day P/L",
];

/******Convert CSV to JSON ***********/
function csvToJson(csvString) {
  const rows = csvString.split("\n");

  const headers = rows[0].split(",");

  const jsonData = [];
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i].split(",");
    if (values.length === headers.length) {
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        const key = headers[j].trim().replace(/[\"]/g, "");
        const value = values[j].trim().replace(/[\"]/g, "");

        obj[key] = value;
      }

      jsonData.push(obj);
    }
  }
  return jsonData;
}

/****************Restructure the json file */
function restructure_json_func(json_data) {
  let restructured_json = {},helper_obj = {};

  json_data.forEach((data) => {
    console.log(data);

    let obj = {
      time: "--",
      instrument: "--",
      order_type: "",
      buy_quantity: "--",
      buy_price: "--",
      realized_quantity: "--",
      sell_price: "--",
      unrealized_quantity: "--",
      adjusted_buying_avg: "--",
      profit_or_loss: "--",
    };

    if (data["Status"] == "COMPLETE") {
      obj.instrument = data["Instrument"].trim();
      let date = data["Time"].trim();
      obj.time = date.split(" ")[1];
      obj.order_type = data["Type"].trim();

      if (!helper_obj[data["Instrument"]]) {
        helper_obj[data["Instrument"]] = {
          unrealized_quantity: 0,
          adjusted_buying_avg: 0,
        };
      }
    date = date.split(" ")[0];
      if (!restructured_json[date]) {
        restructured_json[date] = { trades: [], day_p_l: 0, length: 0 };
      }

      //   console.log(helper_obj, "helper_obj");
      if (data["Type"] == "BUY") {
        obj.buy_quantity = data["Qty."]?.trim();
        obj.buy_quantity = Number(
          obj.buy_quantity.slice(0, obj.buy_quantity.indexOf("/"))
        );
        obj.buy_price = Number(data["Avg. price"]?.trim());

        helper_obj[data["Instrument"]].adjusted_buying_avg =
          (helper_obj[data["Instrument"]].adjusted_buying_avg *
            helper_obj[data["Instrument"]].unrealized_quantity +
            obj.buy_quantity * obj.buy_price) /
          (helper_obj[data["Instrument"]].unrealized_quantity +
            obj.buy_quantity);
        obj.adjusted_buying_avg = Number(
          helper_obj[data["Instrument"]].adjusted_buying_avg.toFixed(2)
        );

        helper_obj[data["Instrument"]].unrealized_quantity += obj.buy_quantity;
        obj.unrealized_quantity =
          helper_obj[data["Instrument"]].unrealized_quantity;
      } else if (data["Type"] == "SELL") {
        obj.realized_quantity = data["Qty."]?.trim();
        obj.realized_quantity = Number(
          obj.realized_quantity.slice(0, obj.realized_quantity.indexOf("/"))
        );
        obj.sell_price = Number(data["Avg. price"]?.trim());
        helper_obj[data["Instrument"]].unrealized_quantity =
          helper_obj[data["Instrument"]].unrealized_quantity -
          obj.realized_quantity;
        obj.unrealized_quantity =
          helper_obj[data["Instrument"]].unrealized_quantity;
        obj.profit_or_loss =
          obj.realized_quantity * obj.sell_price -
          helper_obj[data["Instrument"]].adjusted_buying_avg *
            obj.realized_quantity;
        obj.profit_or_loss = Number(obj.profit_or_loss.toFixed(2));
        restructured_json[date].day_p_l = Number(restructured_json[date].day_p_l.toFixed(2)) +  obj.profit_or_loss;
        
      }

      console.log(restructured_json, "restructured_json");
   
      restructured_json[date].trades.push(obj);
      restructured_json[date].length = restructured_json[date].trades.length;
    }
  });

  return restructured_json;
}
/**************Append and download json data ***/
function append_and_download_json(master_json, child_json) {
  master_json = master_json ?? [];
  if (child_json) {
    master_json = master_json.concat(child_json.reverse());
    let el = document.createElement("a");
    var data =
      "text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(master_json));
    const environment_type = document.querySelector("#environment").value;

    let file_name = `${environment_type.toUpperCase()}_option_master_json_${new Date()
      .toLocaleString()
      .replace(/[/, :]/g, "_")}.json`;
    el.setAttribute("href", "data:" + data);
    el.setAttribute("download", file_name);
    document.body.appendChild(el);
    el.click();
    el.remove();
  }

  return master_json;
}

/***********Generate header**************/
function generate_journal_header() {
  let table_header_ele = document.querySelector("thead");
  let table_header_th = "";
  table_headers_options_arr.forEach((option) => {
    table_header_th += `<th scope="col">${option}</th>`;
  });
  table_header_ele.innerHTML = table_header_th;
}
/**********Generate body rows */
function generate_journal_rows(master_json_data) {
  let tbody = document.querySelector("tbody");
  tbody.innerHTML = ``;
  for (const _date in master_json_data) {
    let data = master_json_data[_date];
    data.trades.forEach((row_obj, index) => {
      let tbody_tr = document.createElement("tr");
      let tds = ``;
      if (index == 0) {
        tds += `<td rowspan = ${data.length}>${_date}</td>`;
      }
      for (const property in row_obj) {
        tds += `<td class = ${property}>${row_obj[property]}</td>`;
      }
      if (index == 0) {
        tds += `<td rowspan = ${data.length}>${data.day_p_l}</td>`;
      }
      tbody_tr.innerHTML = tds;
      let row_class = row_obj.order_type;

      if (row_class == "SELL") {
        row_class = "loss";
        if (row_obj.profit_or_loss > 0) {
          row_class = "profit";
        }
      }

      tbody_tr.setAttribute("class", row_class.toLowerCase());
      tbody.appendChild(tbody_tr);
    });
  }
}

function show_final_profit_and_loss(json_data){
    let final_p_n_l = 0;
    for(const property in json_data){
        final_p_n_l += json_data[property].day_p_l;
    }
    const p_n_l_ele = document.querySelector(".p_n_l_div");
    p_n_l_ele.textContent = final_p_n_l.toFixed(2);
    let color = "green";
    if(final_p_n_l <= 0){
        color = "red";
    }
    p_n_l_ele.style.color = color;

}
/***********Read the existing database */
/**
 * Note : For now I will be manually uploading the JSON database and later I will automate the task
 */

/****** Read and convert csv file on upload */
const csv_file_ele = document.getElementById("csvFile");
let order_book_json;

csv_file_ele.addEventListener("change", function (e) {
  e.preventDefault();
  const file = csv_file_ele.files[0];
  const reader = new FileReader();
  reader.readAsText(file);
  reader.onload = function (e) {
    const data = e.target.result;
    order_book_json = csvToJson(data);
  };
});

/*****Read and convert json file on upload */

const json_file_ele = document.getElementById("jsonFile");
let master_json_data;

json_file_ele.addEventListener("change", function (e) {
  e.preventDefault();
  const file = json_file_ele.files[0];
  const reader = new FileReader();
  reader.readAsText(file);
  reader.onload = function (e) {
    const data = e.target.result;
    master_json_data = JSON.parse(data);
  };
});

/*****Generate the table and dowload the append master json */
const generate_button = document.querySelector("button");

generate_button.addEventListener("click", (e) => {
  e.preventDefault();
  if (!order_book_json && !master_json_data) alert("Please upload files");
  else {
    let json_data = append_and_download_json(master_json_data, order_book_json);

    master_json_data = null;
    order_book_json = null;
    global_master_json_restructured = restructure_json_func(json_data);
    generate_journal_header();
    generate_journal_rows(global_master_json_restructured);
    show_final_profit_and_loss(global_master_json_restructured);
    console.log(
      "global_master_json_restructured",
      global_master_json_restructured
    );
  }
});

/************Change environment button color on click */
const dropdown_btn = document.querySelector("#environment");
dropdown_btn.addEventListener("change" , ()=>{
  dropdown_btn.style.backgroundColor = dropdown_btn.value == "testing" ? "red" : "green";
  
})
/***************************** */
