/**
 * This file is meant to keep all of the variables and functions that are used among several different modules.
 */
module.exports = function() {

  //import necessary modules
  var fs = require('fs');
  var config = require("./config.json");

 return new (function() {

   var self = this; //now 'self' can be used to refer to this class inside the scope of the functions

   var daysInWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
   var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

   //parses JSON without crashing when parsing invalid JSON
   this.parseJSON = function(str) { //not being used
     try {
       return JSON.parse(String(str));
     } catch (ex) {}
   }

   //returns an array of _ids provided an array of objects that contain a _id variable
   this.getIdsFromObjects = function(objects){ //not being used
     result = [];
     for(var i = 0; i < objects.length; i++){
       result.push( objects[i]._id );
     }
     return result;
   }

   //receives an array of _ids of users with a length of 2 and another user _id
   //returns the other user
   this.getUserOtherThanSelf = function(twoUsers, selfId){
     if(twoUsers[0] == selfId){
       return twoUsers[1];
     }else{
       return twoUsers[0];
     }
   }

   //removes duplicates from an array
   this.removeDuplicates = function(arr) {
     var result = [];
     for(var i = 0; i < arr.length; i++) {
       var dup = false;
       for(var j = 0; j < i; j++) {
         if( JSON.stringify( arr[i] ) == JSON.stringify( arr[j] ) ) {
           dup = true;
           break;
         }
       }
       if(!dup) {
         result.push(arr[i]);
       }
     }
     return result;
   }

   this.removeHTML = function(text){
     return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
     //  text.replace(/\<(?!a|br).*?\>/g, "");
   }

   //removes html and adds hyperlinks to some text
   this.normalizeDisplayedText = function(text){
     return Autolinker.link(self.removeHTML(text));
   }

   //converts date string into human readable date
   this.readableDate = function(datestr){
     var date = new Date(datestr);
     return months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
   }

   //creates a list of email adresses seperated by ', ' provided an array of user objects
   this.createRecepientList = function(users){
     var result = "";
     users.forEach(function(user){
       result += user.email + ", ";
       if(user.parentEmail){
          result += user.parentEmail + ", "
       }
     });
     result = result.substring(0, result.length-2);
     return result;
   }

   //determins 'type' of file based on extension (is used for color coding files on the client)
   this.extToType = function(ext){
     var spreadsheet = ['xls', 'xlsx', 'numbers', '_xls', 'xlsb', 'xlsm', 'xltx', 'xlt'];
     var word = ['doc', 'rtf', 'pages', 'txt', 'docx'];
     var image = ['png', 'jpg', 'jpeg', 'jif', 'jfif', 'gif', 'raw', 'tiff', 'bmp', 'rif', 'tif', 'webp'];
     var keynote = ['key', 'ppt', 'pptx'];
     var audio = ['mp4', 'webm', 'mp3', 'wav', 'm4a', 'avi', 'wma', 'ogg', 'm4p', 'ra', 'ram', 'rm', 'mid', 'flv', 'mkv', 'ogv', 'mov', 'mpg'];
     if(~spreadsheet.indexOf(ext)){
       return "spreadsheet";
     }else if (~word.indexOf(ext)) {
       return "word";
     }else if (~image.indexOf(ext)) {
       return "image";
     }else if (~keynote.indexOf(ext)) {
       return "keynote";
     }else if (~audio.indexOf(ext)) {
       return "audio";
     }else if(ext == "pdf"){
       return "pdf";
     }else{
       return "unknown";
     }
   }

   this.uploadToProfPics = function(buffer, destFileName, contentType, callback) {
     self.profPicBucket.upload({
       ACL: 'public-read',
       Body: buffer,
       Key: destFileName.toString(),
       ContentType: contentType,
     }).send(callback);
   }

   this.uploadToDrive = function(buffer, destFileName, contentType, contentDisposition, callback) {
     self.driveBucket.upload({
       Body: buffer,
       Key: destFileName.toString(),
       ContentType: contentType,
       ContentDisposition: contentDisposition
     }).send(callback);
   }

   this.getFileFromDrive = function(fileName, callback){ //not being used
     self.driveBucket.getObject({Key: fileName}).send(callback)
   }

   this.deleteFileFromDrive = function(fileName, callback){
     self.driveBucket.deleteObject({Key: fileName}).send(callback)
   }

   //ext is the extension without the period up front --> example: NOT '.txt', but rather 'txt'
   this.resizeImage = function(buffer, size, ext, callback){
     lwip.open(buffer, ext, function(err, image){
       if(err){
         callback(err, undefined);
       }else{
         var hToWRatio = image.height()/image.width();
         if(hToWRatio >= 1){
           image.resize(size, size*hToWRatio, function(err, image){
             if(err){
               callback(err, undefined);
             }else{
               image.toBuffer(ext, function(err, buffer){
                 if(err){
                   callback(err, undefined);
                 }else{
                   callback(undefined, buffer);
                 }
               })
             }
           })
         }else{
           image.resize(size/hToWRatio, size, function(err, image){
             if(err){
               callback(err, undefined);
             }else{
               image.toBuffer(ext, function(err, buffer){
                 if(err){
                   callback(err, undefined);
                 }else{
                   callback(undefined, buffer);
                 }
               })
             }
           })
         }
       }
     });
   }

   String.prototype.contains = function(arg) {
     return this.indexOf(arg) > -1;
   };

   String.prototype.capitalize = function() {
     return this.charAt(0).toUpperCase() + this.slice(1);
   }

   //checks to see if an array has anything in common with another array
   Array.prototype.hasAnythingFrom = function(arr){
     var result = false;
     var r = [], o = {}, l = arr.length, i, v;
     for (i = 0; i < l; i++) {
         o[arr[i]] = true;
     }
     l = this.length;
     for (i = 0; i < l; i++) {
         v = this[i];
         if (v in o) {
             result = true;
             break;
         }
     }
     return result;
   }

   //checks to see if an array of objects has an object with a specific key value pair
   Array.prototype.hasObjectThatContains = function(key, value){
     for(var i = 0; i < this.length; i++){
       if( this[i][key] == value ){
         return true;
       }
     }
     return false;
   }
 })();
};
