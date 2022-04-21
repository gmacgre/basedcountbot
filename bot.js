const {Client, Intents} = require("discord.js")
const mongoose = require('mongoose')
const config = require("./config.json");
const responses = require("./responses.json")
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, 
                                      Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS]})

// connecting to the DB on our side
mongoose.connect('mongodb://localhost:27017/basedcountbot', {
  useUnifiedTopology: true,
  useNewUrlParser: true
})

//building what is stored in the individual based users- user will be name + guild for separation of pills
const basedMember = new mongoose.Schema({
  user: String,
  pills: Array,
  count: {
    type: Number,
    default: 0
  } 
})

//set up a message for replying to the giving of a pill
//"X is officially based! Their current count is Y"
//"Pills: ...."
//include the currently added pill as well
function formatMessage(basedUser, discordUser){
  let str = ""
  str += "**" +  discordUser.username + " is officially based!**\n";
  str += "Their based count is now " + basedUser.count + ".\n";
  str += "```Pills: ";
  for(let i = 0; i < basedUser.pills.length; i++){
    str += basedUser.pills[i]
    if(i + 1 != basedUser.pills.length){
      str += ", "
    }
  }
  str += "```\n"
  return str;
}

function isPing(string){
  console.log("TESTING STRING: " + string)
  if(string.length != 21){ //length of a user ping
    return false;
  }
  let start = string.substring(0,2);
  if(start != "<@") return false;
  start = string.substring(20);
  if(start != ">") return false;
  return true;
}

function getPill(content, msg){
  let splitContent = content.split(" ");
  while(true){
    //remove the proceeding pings if needed
    if(isPing(splitContent[0])){
      splitContent.shift();
      if(splitContent.length == 0) return -1; //improper format
    }
    else break;
  }
  if(splitContent[0].toLowerCase() == "baste" || splitContent[0].toLowerCase() == "based"){
    //start getting the pill
    splitContent.shift();
    if(splitContent.length == 0) return -2; //valid based, but no pill
    if(splitContent[0].toLowerCase() == "and"){
      splitContent.shift();
      //these remove the "based and" sections of the pill
      let pill = ""
      while(!splitContent[0].toLowerCase().includes("pilled")){
        if(isPing(splitContent[0])){
          let number = splitContent[0].slice(2, 20)
          console.log("Dealing with getting the username")
          console.log(number)
          for(user of msg.mentions.users){
            if(user[0] == number){
              pill += user[1].username + " ";
            }
          }
        }
        else pill += splitContent[0] + " ";
        splitContent.shift();
        if(splitContent.length == 0) {
          //"based and a w e g ab ag " -> not gonna be a based, man
          console.log("Returning -1: no final 'pilled'")
          return -1;
        }
      }
      if(splitContent[0].toLowerCase() != "pilled"){
        let finalPart = splitContent[0].split("pilled")[0];
        if(finalPart[finalPart.length - 1] == '-'){
          finalPart = finalPart.slice(0, -1);
        }
        if(isPing(finalPart)){
          let number = splitContent[0].slice(2, 20)
          console.log(number)
          for(user of msg.mentions.users){
            if(user[0] == number){
              pill += user[1].username + " ";
            }
          }
        }
        else{
          pill += finalPart
        }
      }
      else{
        pill = pill.slice(0, -1);
      }
      if(pill== "") return -2; //empty pill, just give the based.
      return pill;
    }
    else{
      console.log("Returning -1: and not second")
      return -1; //improper format "based on the context...."
    }
  }
  else {
    console.log("Returning -1: based not first")
    return -1; //not a proper format -> based not the first thing after possible pings
  }
}

async function addBasedReply(msg, rephash, userhash, targetUser){
  if(rephash == userhash){
    let selfReplyResLength = responses.selfReplies.length
    let replyMessage = Math.floor(Math.random() * selfReplyResLength);
    msg.reply(responses.selfReplies[replyMessage])
  }
  else{
    //valid giving of a pill
    //go into the database, and set up a user if needed
    //increment the based count, add pills as needed
    //post giant listing of pills/count
    let pill = getPill(msg.content, msg);
    if(pill == -1){
      return; //based was not the first thing in the phrase, pill should not be given.
    }
    let basedUser = await theBased.findOne({ user: rephash });
    if(basedUser == null){
      const basedUserNew = new theBased({ user: rephash, pills: [] });
      basedUser = basedUserNew;
    }
    basedUser.count += 1;
    if(pill != -2){ //valid pill can be given
      basedUser.pills.push(pill);
    }
    await basedUser.save();
    let messageBack = formatMessage(basedUser, targetUser);
    msg.reply(messageBack);
  }
}

async function pilltheRest(msg, repUserId){
  let authHash = msg.author.id + msg.guildId;
  for(user of msg.mentions.users){
    if(user[0] == repUserId) continue;
    let rephash = user[0] + msg.guildId;
    addBasedReply(msg, rephash, authHash, user[1]);
  }
}

async function remPills(msg){
  let splitmsg = msg.content.split(" ")
  //first should be the command "remPills"
  //second is the user id in number format
  let id = splitmsg[1] + msg.guildId
  console.log("ID OF PILLS TO REMOVE " + id)
  let cursedUser = await theBased.findOne({ user: id})
  if(cursedUser == null){
    console.log("No valid user to rem pills from")
    return false
  }
  cursedUser.pills = [];
  await cursedUser.save()
  return true
}

//creating the based table, ready for use in functions
const theBased = mongoose.model('based', basedMember);

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.on("messageCreate", async (msg) => {
  if(msg.author != client.user){
    if(msg.author.id == config.builderID){
      //I am the master, if content is killBot it will die
      if(msg.content == config.killCommand) {
        client.destroy();
        mongoose.connection.close()
      }
    }
    console.log(msg.content)
    text = msg.content.toLowerCase()
    if (text.includes("based") || text.includes("baste")) {
      let repliedUserId = null;
      if(msg.type == "REPLY"){
        let rephash = msg.mentions.repliedUser.id + msg.guildId;
        let userhash = msg.author.id + msg.guildId;
        let targetUser = msg.mentions.repliedUser;
        await addBasedReply(msg, rephash, userhash, targetUser);
        repliedUserId = msg.mentions.repliedUser.id;
      }
      pilltheRest(msg, repliedUserId);
    }
    else if (text.includes("remPills") && msg.author.id == config.builderID){
      let boolin = remPills(msg)
      if (boolin){
        //send a message that pills have been rem'd
        msg.reply("Pills removed for that user")
      }
      else{
        msg.reply("Pills not removed- check log")
      }
    }
  }
})

client.login(config.token)