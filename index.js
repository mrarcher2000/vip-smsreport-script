const domainInput = document.querySelector("#domain");



const ns_access = "c63b2394ba7582fbad434cb8b17c205d";

var messageData = [];
var smsCount = null;
var messageCount = 0;
var messagePending = false;

const runScript = function () {
    if (domainInput.value) {
        document.querySelector("#parseError").style = "display: none;";
        console.log(domainInput.value);

        getSessions();
    } 

    else {
        document.querySelector("#parseError").style= "display: visible;color: red; font-weight: 500; margin: 20px;";
        console.log("No domain input received.");
    }
}


var chttp = new XMLHttpRequest();
const getSessions = function () {
    let sessRequestBody = `{ "domain":"${domainInput.value}", "user":"", "limit":"5000", "sort": "start_timestamp asc" }`;

    chttp.open("POST", 'https://crexendo-core-021-las.cls.iaas.run/ns-api/?object=messagesession&action=read');
    chttp.setRequestHeader("Authorization", `Bearer ${ns_access}`);
    chttp.send(sessRequestBody);
}

chttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        console.log(chttp.responseXML);

        if (chttp.responseXML.getElementsByTagName("session_id")) {
            let chatsessions = chttp.responseXML.getElementsByTagName("session_id");
            smsCount = chatsessions.length;
            // console.log(chatsessions + `\n smsCount is ${smsCount}`);
            getMessages(chatsessions);
        } else {
            console.log("Unable to load session IDs!");
        }
    } else {
        console.log("Status: " + chttp.status + "\nError: " + chttp.responseText);
    }
}


const getMessages = function(sessions) {
    console.log("getMessages func called.");

    let lastSessionId = "";
    console.log(`Counting ${smsCount} message sessions to parse`);

    for (i=0; i < sessions.length; i++) {
        console.log(sessions[i].textContent);

        let sessionId = sessions[i].textContent;
        if (sessionId.includes("meeting")) {
            smsCount--;
            continue;
        }

        if (sessionId === lastSessionId) {
            smsCount--;
            continue;
        }

        messageXMLRequest(sessionId);
        lastSessionId = sessionId;
    }
}

const messageXMLRequest = function (sessionID) {
    console.log("messageXMLRequest beginning...");
    pendingMessage = true;


    var mhttp = new XMLHttpRequest();

    mhttp.open("POST", "https://crexendo-core-031-dfw.cls.iaas.run/ns-api/?object=message&action=read");
    mhttp.setRequestHeader("Authorization", `Bearer ${ns_access}`);
    mhttp.send(`{ "domain":"${domainInput.value}", "user":"", "session_id":"${sessionID}", "limit":"1000" }`);

    mhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            console.log(mhttp.responseXML);

            let messagesXML = mhttp.responseXML.getElementsByTagName("message");
            messageCount = messageCount + messagesXML.length;
            for (i=0; i<messagesXML.length; i++) {
                let timestamp = messagesXML[i].getElementsByTagName("timestamp")[0].textContent;
                let type = messagesXML[i].getElementsByTagName("type")[0].textContent;
                let from_uid = messagesXML[i].getElementsByTagName("from_uid")[0].textContent;
                let from_num = messagesXML[i].getElementsByTagName("from_num")[0].textContent;
                let dialed = messagesXML[i].getElementsByTagName("dialed")[0].textContent;
                let text = messagesXML[i].getElementsByTagName("text")[0].textContent;
                let term_num = messagesXML[i].getElementsByTagName("term_num")[0].textContent;
                let term_uid = messagesXML[i].getElementsByTagName("term_uid")[0].textContent;
                let remotepath = '';
                let mediatype = "";
                if (type == "mms") {
                    remotepath = messagesXML[i].getElementsByTagName("remotepath")[0].textContent;
                    mediatype = messagesXML[i].getElementsByTagName("media_type")[0].textContent;
                }

                let singleMessage = {
                    "Timestamp (UTC)": `${timestamp}`,
                    "Message Type": `${type}`,
                    "From User": `${from_uid}`,
                    "From Number": `${from_num}`,
                    "Dialed Number": `${dialed}`,
                    "To User": `${term_uid}`,
                    "To Number": `${term_num}`,
                    "Message Text": `${text}`,
                    "Media Type": `${mediatype}`,
                    "Media": `${remotepath}`
                };


                messageData.push(singleMessage);
                messagePending = false;

                if (i == (messagesXML.length - 1)) {
                    smsCount--;
                }
            }

        } else if (this.readyState == 4 && this.status !== 200) {
            console.log("Fail to parse conversation at session ID " + sessionID);
        }
        createCSV();
    }
}



const createCSV = function() {

    console.log("Message Data is: " + messageData + `\n smsCount is ${smsCount} \nmessageCount is ${messageCount} \nmessagePending is ${messagePending}`);

    if (messageCount == messageData.length && smsCount == 0) {
        var csvHeaders = Object.keys(messageData[0]).toString();
        var csvData = messageData.map((item) => {
            return Object.values(item).toString();
        });


        var csv = [csvHeaders, ...csvData].join('\n');
        
        downloadCSV(csv);
    }
}


const downloadCSV = function(csv) {
    const csvBlob = new Blob([csv], { type: 'application/csv' });
    const url = URL.createObjectURL(csvBlob);
    var csvAnchor = document.createElement('a');
    csvAnchor.download = 'sms-report.csv';
    csvAnchor.href = url;
    csvAnchor.style.display = "none";

    document.body.appendChild(csvAnchor);
    csvAnchor.click();
    csvAnchor.remove();
    URL.revokeObjectURL(url);
}



document.getElementById("submitbtn").addEventListener("click", (e) => {
    e.preventDefault();
    runScript();

});