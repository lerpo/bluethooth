const app = getApp()
var util = require('../../utils/util.js');
var time = 0;
var imageData = [];
var k = 0;

function inArray(arr, key, val) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i][key] === val) {
      return i;
    }
  }
  return -1;
}

// ArrayBuffer转16进度字符串示例
function ab2hex(buffer) {
  var hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    function(bit) {
      return ('00' + bit.toString(16)).slice(-2)
    }
  )
  return hexArr.join('');
}

function strToBinary(str) {
  var result = [];
  var list = str.split("");
  for (var i = 0; i < list.length; i++) {
    if (i != 0) {
      result.push(" ");
    }
    var item = list[i];
    var binaryStr = item.charCodeAt().toString(2);
    if (binaryStr) {
      result.push(binartStr);
    }
  }
  return result.join("");
}

Page({
  data: {

    devices: [],
    connected: false,
    chs: [],
  },
  openBluetoothAdapter() {
    wx.openBluetoothAdapter({
      success: (res) => {
        console.log('openBluetoothAdapter success', res)
        this.startBluetoothDevicesDiscovery()
      },
      fail: (res) => {
        if (res.errCode === 10001) {
          wx.onBluetoothAdapterStateChange(function(res) {
            console.log('onBluetoothAdapterStateChange', res)
            if (res.available) {
              this.startBluetoothDevicesDiscovery()
            }
          })
        }
      }
    })
  },
  getBluetoothAdapterState() {
    wx.getBluetoothAdapterState({
      success: (res) => {
        console.log('getBluetoothAdapterState', res)
        if (res.discovering) {
          this.onBluetoothDeviceFound()
        } else if (res.available) {
          this.startBluetoothDevicesDiscovery()
        }
      }
    })
  },
  startBluetoothDevicesDiscovery() {
    if (this._discoveryStarted) {
      return
    }
    this._discoveryStarted = true
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: true,
      success: (res) => {
        console.log('startBluetoothDevicesDiscovery success', res)
        this.onBluetoothDeviceFound()
      },
    })
  },
  stopBluetoothDevicesDiscovery() {
    wx.stopBluetoothDevicesDiscovery()
  },
  onBluetoothDeviceFound() {
    wx.onBluetoothDeviceFound((res) => {
      res.devices.forEach(device => {
        if (!device.name && !device.localName) {
          return
        }
        const foundDevices = this.data.devices
        const idx = inArray(foundDevices, 'deviceId', device.deviceId)
        const data = {}
        if (idx === -1) {
          data[`devices[${foundDevices.length}]`] = device
        } else {
          data[`devices[${idx}]`] = device
        }
        this.setData(data)
      })
    })
  },
  createBLEConnection(e) {
    const ds = e.currentTarget.dataset
    const deviceId = ds.deviceId
    const name = ds.name
    wx.createBLEConnection({
      deviceId,
      success: (res) => {
        this.setData({
          connected: true,
          name,
          deviceId,
        })
        this.getBLEDeviceServices(deviceId)
      }
    })
    this.stopBluetoothDevicesDiscovery()
  },
  closeBLEConnection() {
    wx.closeBLEConnection({
      deviceId: this.data.deviceId
    })
    this.setData({
      connected: false,
      chs: [],
      canWrite: false,
    })
  },
  getBLEDeviceServices(deviceId) {
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        for (let i = 0; i < res.services.length; i++) {
          if (res.services[i].isPrimary) {
            this.getBLEDeviceCharacteristics(deviceId, res.services[i].uuid)
            return
          }
        }
      }
    })
  },
  getBLEDeviceCharacteristics(deviceId, serviceId) {
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: (res) => {
        console.log('getBLEDeviceCharacteristics success', res.characteristics)
        for (let i = 0; i < res.characteristics.length; i++) {
          let item = res.characteristics[i]
          if (item.properties.read) {
            wx.readBLECharacteristicValue({
              deviceId,
              serviceId,
              characteristicId: item.uuid,
            })
          }
          if (item.properties.write) {
            this.setData({
              canWrite: true
            })
            this._deviceId = deviceId
            this._serviceId = serviceId
            this._characteristicId = item.uuid
            this.writeBLECharacteristicValue()
          }
          if (item.properties.notify || item.properties.indicate) {
            wx.notifyBLECharacteristicValueChange({
              deviceId,
              serviceId,
              characteristicId: item.uuid,
              state: true,
            })
          }
        }
      },
      fail(res) {
        console.error('getBLEDeviceCharacteristics', res)
      }
    })
    // 操作之前先监听，保证第一时间获取数据
    wx.onBLECharacteristicValueChange((characteristic) => {
      const idx = inArray(this.data.chs, 'uuid', characteristic.characteristicId)
      const data = {}
      if (idx === -1) {
        data[`chs[${this.data.chs.length}]`] = {
          uuid: characteristic.characteristicId,
          value: ab2hex(characteristic.value)
        }
      } else {
        data[`chs[${idx}]`] = {
          uuid: characteristic.characteristicId,
          value: ab2hex(characteristic.value)
        }
      }
      // data[`chs[${this.data.chs.length}]`] = {
      //   uuid: characteristic.characteristicId,
      //   value: ab2hex(characteristic.value)
      // }
      this.setData(data)
    })
  },
  hexCharCodeToStr(hexCharCodeStr) {
    var trimedStr = hexCharCodeStr.trim();
    var rawStr = trimedStr.substr(0, 2).toLowerCase() === '0x' ? trimedStr.substr(2) : trimedStr;
    var len = rawStr.length;
    var curCharCode;
    var resultStr = [];
    for (var i = 0; i < len; i = i + 2) {
      curCharCode = parseInt(rawStr.substr(i, 2), 16);
      resultStr.push(String.fromCharCode(curCharCode));
    }
    return resultStr.join('');
  },
  send0X0A() {
    const buffer = new ArrayBuffer(1)
    const dataView = new DataView(buffer)
    dataView.setUint8(0, 0x0A)
    return buffer;
  },

  writeBLECharacteristicValue() {
    // let str = "你好 世界";
    // let dataBuffer = new ArrayBuffer(100)
    // let dataView = new DataView(dataBuffer)
    //  for (var i = 0; i < str.length; i++) {
    //   dataView.setUint8(i, str.charAt(i).charCodeAt())
    // }
    // wx.writeBLECharacteristicValue({
    //   deviceId: this._deviceId,
    //   serviceId: this._serviceId,
    //   characteristicId: this._characteristicId,
    //   value: dataBuffer,
    //   success: function(res) {
    //     console.log('message发送成功')
    //   },
    //   fail: function(res) {
    //     console.log("data:" + res)
    //   },
    //   complete: function(res) {
    //     console.log("data:" + res)
    //   }
    // })
    



   
    // let dataHex = ab2hex(dataBuffer);
    // this.writeDatas = that.hexCharCodeToStr(dataHex);

    // // 向蓝牙设备发送一个0x00的16进制数据
    // // let buffer = new ArrayBuffer(1)
    // // let dataView = new DataView(buffer)
    // // dataView.setUint8(0, Math.random() * 255 | 0)

    
    // this.printImg();

    var str = util.hexStringToBuff("你好这是一个大世界");
    this.sendStr(str);

  },
  closeBluetoothAdapter() {
    wx.closeBluetoothAdapter()
    this._discoveryStarted = false
  },

  printImg() {
    let that = this;
    wx.getImageInfo({
      src: 'http://img4.imgtn.bdimg.com/it/u=2378606792,1096904360&fm=26&gp=0.jpg',
      success: function(ret) {
        var path = ret.path;
        var canvas = wx.createCanvasContext('shareCanvas')
        canvas.drawImage(path, 0, 0, 600, 100);
        canvas.draw()
        console.log(path)

        wx.canvasGetImageData({
          canvasId: 'shareCanvas',
          x: 0,
          y: 0,
          width: 600,
          height: 100,
          success(res) {
            // console.log(res.width) // 100
            // console.log(res.height) // 100
            // console.log(res.data instanceof Uint8ClampedArray) // true
            // console.log(res.data.length) // 100 * 100 * 4
            imageData = that.draw2PxPoint(res);
            that.sendCodeData();
          },
          fail: function(error) {
            console.log("error:" + error);
          }
        })
      }
    })
  },
  sendCodeData: function() {

    var dataBuffer = new ArrayBuffer(40);
    var dataView = new DataView(dataBuffer)
    for (var i = 0; i < 20; i++) {
      if (k < imageData.length)
        dataView.setInt16(i, imageData[k].toString(16));
      console.log(imageData[k]);
      k++;
    }
    if (k < imageData.length) {
      this.sendCode(dataBuffer);
    }

  },
  sendCode: function(data) {
    var that = this;
    wx.writeBLECharacteristicValue({
      deviceId: this._deviceId,
      serviceId: this._serviceId,
      characteristicId: this._characteristicId,
      value: data,
      success: function(res) {
        that.sendCodeData();
        console.log('发送的数据：' + data)
        console.log('message发送成功')
      },
      fail: function(res) {
        console.log("数据发送失败:" + JSON.stringify(res))
      },
      complete: function(res) {
        console.log("发送完成:" + JSON.stringify(res))
      }
    })
  },

  sendStr: function(str) {
    // var binnarStr =  strToBinary(str);
   // let dataBuffer = this.hexStringToArrayBuffer(str);

    var that = this;
    wx.writeBLECharacteristicValue({
      deviceId: this._deviceId,
      serviceId: this._serviceId,
      characteristicId: this._characteristicId,
      value: str,
      success: function(res) {
        console.log('发送的数据：' + str)
        console.log('message发送成功')
      },
      fail: function(res) {
        console.log("数据发送失败:" + JSON.stringify(res))
      },
      complete: function(res) {
        console.log("发送完成:" + JSON.stringify(res))
      }
    })

  },

  hexStringToArrayBuffer: function(str) {
    // if (/[\u0080-\uffff]/.test(str)) {
    //   var arr = new Array(str.length);
    //   for (var i = 0, j = 0, len = str.length; i < len; ++i) {
    //     var cc = str.charCodeAt(i);
    //     if (cc < 128) {
    //       //single byte
    //       arr[j++] = cc;
    //     } else {
    //       //UTF-8 multibyte
    //       if (cc < 2048) {
    //         arr[j++] = (cc >> 6) | 192;
    //       } else {
    //         arr[j++] = (cc >> 12) | 224;
    //         arr[j++] = ((cc >> 6) & 63) | 128;
    //       }
    //       arr[j++] = (cc & 63) | 128;
    //     }
    //   }
    //   var byteArray = new Uint8Array(arr);
    // } else {
    //   var byteArray = new Uint8Array(str.length);
    //   for (var i = str.length; i--;)
    //     byteArray[i] = str.charCodeAt(i);
    // }
    // return byteArray.buffer;

    let dataBuffer = new ArrayBuffer(100)
    let dataView = new DataView(dataBuffer)
    // for (var i = 0; i < str.length; i++) {
    //   dataView.setUint8(i, str.charAt(i))
    // }

    return dataBuffer


    // var buffer = new ArrayBuffer(str.length * 8)

    // var dataView = new Uint16Array(buffer)

    // var array = []

    // for (var i = 0, len = str.length; i < len; i++) {

    //   var uniStr = str.charCodeAt(i)

    //   console.log('unistr = ' + uniStr + ',' + str.charAt(i))

    //   if (uniStr >= 18868 && uniStr <= 40869) {

    //     // 如果是中文



    //   }

    //   dataView[i] = uniStr

    // }

    // return buffer
  },

  uniencode: function(str) {
    if (!str) {
      return;
    }
    var unicode = '';
    for (var i = 0; i < str.length; i++) {
      var temp = str.charAt(i);
      if (this.isChinese(temp)) {
        unicode += '\\u' + temp.charCodeAt(0).toString(16);
      } else {
        unicode += temp;
      }
    }
    return unicode;
  },

  isChinese: function(s) {
    return /[\u4e00-\u9fa5]/.test(s);
  },

  draw2PxPoint: function(bmp) {
    //用来存储转换后的 bitmap 数据。为什么要再加1000，这是为了应对当图片高度无法      
    //整除24时的情况。比如bitmap 分辨率为 240 * 250，占用 7500 byte，
    //但是实际上要存储11行数据，每一行需要 24 * 240 / 8 =720byte 的空间。再加上一些指令存储的开销，
    //所以多申请 1000byte 的空间是稳妥的，不然运行时会抛出数组访问越界的异常。
    var that = this;
    let size = bmp.width * bmp.height / 8 + 1000;
    var data = new Array();
    var k = 0;
    //设置行距为0的指令
    data[k++] = 0x1B;
    data[k++] = 0x33;
    data[k++] = 0x00;

    data[k++] = 0x1B;
    data[k++] = 0x61;
    data[k++] = 1;
    var index = 255 / 2;
    var imgdata = [];
    var z = 0;
    for (var i = 0; i < bmp.data.length; i += 4) {
      var R = bmp.data[i]; //R(0-255)
      var G = bmp.data[i + 1]; //G(0-255)
      var B = bmp.data[i + 2]; //B(0-255)
      //var Alpha = bmp.data[i + 3]; //Alpha(0-255)
      //var sum = (R + G + B) / 3;
      var gray = that.RGB2Gray(R, G, B);
      if (gray < 200) {
        // bmp.data[i] = 1;
        // bmp.data[i + 1] = 1;
        // bmp.data[i + 2] = 1;
        // bmp.data[i + 3] = 1;
        imgdata[z++] = 1;
      } else {
        // bmp.data[i] = 0;
        // bmp.data[i + 1] = 0;
        // bmp.data[i + 2] = 0;
        // bmp.data[i + 3] = 0;
        imgdata[z++] = 0;
      }
    }

    // 逐行打印
    for (var j = 0; j < bmp.height; j++) {

      data[k++] = 0x1B;
      data[k++] = 0x24;
      data[k++] = 5;
      data[k++] = 0;
      //打印图片的指令
      data[k++] = 0x1B;
      data[k++] = 0x2A;
      data[k++] = 33;
      data[k++] = (bmp.width % 256); //nL
      data[k++] = (bmp.width / 256);
      //对于每一行，逐列打印
      for (var i = 0; i < bmp.width / 4; i++) {
        //每一列24个像素点，分为3个字节存储
        // for (var m = 0; m < 3; m++) {
        //   //每个字节表示8个像素点，0表示白色，1表示黑色
        //   for (var n = 0; n < 8; n++) {
        //     var b = imgdata[i * bmp.width + j * 24 + m * 8 + n]
        //     // that.px2Byte(i, j * 24 + m * 8 + n, bmp, bmp.data[i]);
        //     if (data[k] == undefined) {
        //       data[k] = 0 + b
        //     } else {
        //       data[k] += data[k] + b;
        //     }
        //   }
        //   k++;
        // }
        data[k++] = imgdata[j * (bmp.width / 4) + i]
      }

      data[k++] = 0x0A; //换行
    }

    return data;
  },


  px2Byte: function(x, y, img, bit) {
    if (x < bit.width && y < bit.height) {
      var b;
      let pixel = bit;
      let red = (pixel & 0x00ff0000) >> 16; // 取高两位
      let green = (pixel & 0x0000ff00) >> 8; // 取中两位
      let blue = pixel & 0x000000ff; // 取低两位
      let gray = this.RGB2Gray(red, green, blue);
      if (gray < 128) {
        b = 1;
      } else {
        b = 0;
      }
      return b;
    }
    return 0;
  },

  /**
   * 图片灰度的转化
   */
  RGB2Gray: function(r, g, b) {
    let gray = (0.29900 * r + 0.58700 * g + 0.11400 * b); //灰度转化公式
    return gray;
  },

   




})