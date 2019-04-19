const gbk = require('./gbk.js');
console.log("sasas" + gbk);
const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}


const hexStringToBuff = str => { //str='中国：WXHSH'
  const buffer = new ArrayBuffer((sumStrLength(str)) * 4)
  const dataView = new DataView(buffer)
  var data = str.toString();
  var p = 0; //ArrayBuffer 偏移量
  for (var i = 0; i < data.length; i++) {
    if (isCN(data[i])) { //是中文
      //调用GBK 转码
      var t = gbk.encode(data[i]);
      for (var j = 0; j < 2; j++) {
        //var code = t[j * 2] + t[j * 2 + 1];
        var code = t[j * 3 + 1] + t[j * 3 + 2];
         var temp = parseInt(code, 16)
        //var temp = strToHexCharCode(code);
        dataView.setUint8(p++, temp)
      }
    } else {
      var temp = data.charCodeAt(i);
      dataView.setUint8(p++, temp)
    }
  }
  return buffer;
}

function toUnicode(s) {
  var str = "";
  for (var i = 0; i < s.length; i++) {
    str += "\\u" + s.charCodeAt(i).toString(16) + "\t";
  }
  return str;
}

function strToHexCharCode(str) {
  if (str === "")
    return "";
  var hexCharCode = [];
  hexCharCode.push("0x");
  for (var i = 0; i < str.length; i++) {
    hexCharCode.push((str.charCodeAt(i)).toString(16));
  }
  return hexCharCode.join("");
}

function sumStrLength(str) {
  var length = 0;
  var data = str.toString();
  for (var i = 0; i < data.length; i++) {
    if (isCN(data[i])) { //是中文
      length += 2;
    } else {
      length += 1;
    }
  }
  return length;
}

function isCN(str) {
  if (/^[\u3220-\uFA29]+$/.test(str)) {
    return true;
  } else {
    return false;
  }
}

//汉字转码
function hexStringToArrayBuffer(str) {
  const buffer = new ArrayBuffer((str.length / 2) + 1)
  const dataView = new DataView(buffer)
  for (var i = 0; i < str.length / 2; i++) {
    var temp = parseInt(str[i * 2] + str[i * 2 + 1], 16)
    dataView.setUint8(i, temp)
  }
  dataView.setUint8((str.length / 2), 0x0a)
  return buffer;
}

//返回八位数组
function subString(str) {
  var arr = [];
  if (str.length > 8) { //大于8
    for (var i = 0;
      (i * 8) < str.length; i++) {
      var temp = str.substring(i * 8, 8 * i + 8);
      arr.push(temp)
    }
    return arr;
  } else {
    return str
  }
}

//不带有汉字
function hexStringToArrayBufferstr(str) {
  let val = ""
  for (let i = 0; i < str.length; i++) {
    if (val === '') {
      val = str.charCodeAt(i).toString(16)
    } else {
      val += ',' + str.charCodeAt(i).toString(16)
    }
  }
  val += "," + "0x0a";
  console.log(val)
  // 将16进制转化为ArrayBuffer
  return new Uint8Array(val.match(/[\da-f]{2}/gi).map(function(h) {
    return parseInt(h, 16)
  })).buffer
}

function send0X0A() {
  const buffer = new ArrayBuffer(1)
  const dataView = new DataView(buffer)
  dataView.setUint8(0, 0x0a)
  return buffer;
}


module.exports = {
  hexStringToArrayBuffer: hexStringToArrayBuffer,
  hexStringToBuff: hexStringToBuff,
  send0X0A: send0X0A
}