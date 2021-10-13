// npm init -y
// npm install minimist
// npm install axios
// npm install jsdom
// npm install excel4node
// npm install pdf-lib
// npm install path

// node CricInfoExtracter.js  --json=teams.json --excel=Worldcup.csv --dataDir=data --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results 

// <-- REQUIRE LIBRARIES --> //

let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel4node = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs")
let path = require("path")


let args = minimist(process.argv);

// donwload using axios
// read using jsdom
// make excel using excel4node
// make pdf using pdf-lib


// donwload using axios
let dwnldPromise = axios(args.source)
dwnldPromise.then(function(response){
    let HTML = response.data
    
    // read using jsdom

    let dom = new jsdom.JSDOM(HTML)
  
     let document  = dom.window.document

     let matches = []

     let matchDivs = document.querySelectorAll("div.match-score-block")
    

     for(let i = 0; i<matchDivs.length; i++){

       
         
        let match = {}

        let Name = matchDivs[i].querySelectorAll("p.name")
        match.t1name = Name[0].textContent
        match.t2name = Name[1].textContent 

        let Score = matchDivs[i].querySelectorAll("span.score")
        if(Score.length == 0){
            match.t1score = ""
            match.t2score = ""        
        }
        else if(Score.length == 1){
            match.t1score = Score[0].textContent
            match.t2score = ""  
        }
        else if(Score.length == 2){
            match.t1score = Score[0].textContent
            match.t2score = Score[1].textContent
        }
           
           let Result = matchDivs[i].querySelectorAll("div.match-info > div.status-text")
          
           match.result = Result[0].textContent

           

           

           matches.push(match)
          
           
     }

      console.log(matches)

    //  let Matched = JSON.stringify(matches)
     
    //  fs.writeFileSync(args.dest,Matched,"utf-8")
    let teams = []
    for(let i = 0; i < matches.length; i++){
        addTeamToTeamsArrayIfNotAlreadyThere(teams, matches[i].t1name);
        addTeamToTeamsArrayIfNotAlreadyThere(teams, matches[i].t2name);
    }

    for(let i = 0; i < matches.length; i++){
        addMatchToSpecificTeam(teams, matches[i].t1name, matches[i].t2name, matches[i].t1score, matches[i].t2score, matches[i].result);
        addMatchToSpecificTeam(teams, matches[i].t2name, matches[i].t1name, matches[i].t2score, matches[i].t1score, matches[i].result);
    }

    // let teamsKaJSON = JSON.stringify(teams);
    // fs.writeFileSync("teams.json", teamsKaJSON, "utf-8");

    


}).catch(function (err) {
    console.log("error")
})

let teamsJSON = fs.readFileSync(args.json, "utf-8")
teams = JSON.parse(teamsJSON)


// make excel using excel4node

// let wb = new excel4node.Workbook()
//     for(let i=0; i<teams.length; i++){
    
//         let sheet = wb.addWorksheet(teams[i].name);
//         for(let j = 0; j<teams[i].matches.length; j++){
//         sheet.cell(1, 1).string("Opponent");
//         sheet.cell(j+1, 1).string(teams[i].matches[j].vs);
//         sheet.cell(1, 2).string("Self-Score");
//         sheet.cell(j+1, 2).string(teams[i].matches[j].selfScore);
//         sheet.cell(1,3 ).string("Opponent Score");
//         sheet.cell(j+1,3).string(teams[i].matches[j].oppScore);
//         sheet.cell(1,4 ).string("Result");
//         sheet.cell(j+1, 4).string(teams[i].matches[j].result);
     
    
        
//         }
        
//     }
    
    
//     wb.write(args.excel)


// make pdf using pdf-lib

    prepareFoldersAndPdfs(teams, args.dataDir);


function prepareFoldersAndPdfs(teams, dataDir) {
    if(fs.existsSync(dataDir) == true){
        fs.rmdirSync(dataDir, { recursive: true });
    }

    fs.mkdirSync(dataDir);

    for (let i = 0; i < teams.length; i++) {
        let teamFolderName = path.join(dataDir, teams[i].name);
        fs.mkdirSync(teamFolderName);

        for (let j = 0; j < teams[i].matches.length; j++) {
            let match = teams[i].matches[j];
            createMatchScorecardPdf(teamFolderName, teams[i].name, match);
        }
    }
}

function createMatchScorecardPdf(teamFolderName, homeTeam, match) {
    let matchFileName = path.join(teamFolderName, match.vs);

    let templateFileBytes = fs.readFileSync("Template.pdf");
    let pdfdocKaPromise = pdf.PDFDocument.load(templateFileBytes);
    pdfdocKaPromise.then(function (pdfdoc) {
        let page = pdfdoc.getPage(0);

        page.drawText(homeTeam, {
            x: 320,
            y: 668,
            size: 18,
           
            
        });
        page.drawText(match.vs, {
            x: 60,
            y: 545,
            size: 18,
            
        });
        page.drawText(match.selfScore, {
            x: 300,
            y: 545,
            size: 18,
          
        });
        page.drawText(match.oppScore, {
            x: 480,
            y: 545,
            size: 18,
            
        });
        page.drawText(match.result, {
            x: 180,
            y: 435,
            size: 16,
            
        });

        let changedBytesKaPromise = pdfdoc.save();
        changedBytesKaPromise.then(function (changedBytes) {
           let i = 1;
            if(fs.existsSync(matchFileName  + ".pdf") == true){
                fs.writeFileSync(matchFileName +i + ".pdf", changedBytes);
                i++;
            } else {
                fs.writeFileSync(matchFileName + ".pdf", changedBytes);
            }
            
        })
    })
}

function addMatchToSpecificTeam(teams, homeTeam, oppTeam, selfScore, oppScore, result){
    let tidx = -1;
    for(let i = 0; i < teams.length; i++){
        if(teams[i].name == homeTeam){
            tidx = i;
            break;
        }
    }

    let team = teams[tidx];
    team.matches.push({
        vs: oppTeam,
        selfScore: selfScore,
        oppScore: oppScore,
        result: result
    })
}

function addTeamToTeamsArrayIfNotAlreadyThere(teams, teamName){
    let tidx = -1;
    for(let i = 0; i < teams.length; i++){
        if(teams[i].name == teamName){
            tidx = i;
            break;
        }
    }

    if(tidx == -1){
        teams.push({
            name: teamName,
            matches: []
        })
    }
}