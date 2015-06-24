var fs = require("fs");
var makeArray = require("make-array");
var  argv =  process.argv;
var rootPath = process.cwd();
var path =  require("path");

var DIR_NANME;
var cssLinkRxg = /<link\s+(?:rel\=[\"\']stylesheet[\"\']\s+)?(?:type\=[\"\']text\/css[\"\']\s+)?href\=[\"\']\{{3}([\w\.\/\'\"\s\-]+)\}{3}[\"\']\s*\/?>/g,
	hrefRxg = /\{{3}\s*(static|modfile)\s*[\'\"]([\w\.\/\s\-]+)[\'\"]\s*\}{3}/,
	imgHrefRxg = /<img\s+src\=[\'\"]\{{3}(static|modfile)\s+[\'\"]([\w\.\/\'\"\s\-]+)[\'\"]\s*\}{3}[\'\"]\s*\/?>/g,
	bgHrefRxg = /url\([\'\"]?([\w\.\/\s\-]+)[\'\"]?\)/g,
	bgSrcRxg = /url\([\'\"]?([\w\.\/\s\-]+)[\'\"]?\)/,
	jsSrcRxg = /\{{3}\s*(facade)\s*[\'\"]([\w\.\/\s\-]+)[\'\"]\s*\}{3}/;


function readHTMLFile(file,filePath){
	
	var fileStream = file;
	var cssLinkArr = fileStream.match(cssLinkRxg);
	var img2HTMLLinkArr = fileStream.match(imgHrefRxg);
	//html中所有的css路径
	var css2HtmlArr = readLink(cssLinkArr);

	var cssArr = readLink(cssLinkArr).map(function(item){
		return item.link;
	})

	//html路径
	var htmlArr = makeHtmlArr(filePath);

	//html中所用的img路径
	var img2HtmlArr = readLink(img2HTMLLinkArr);

	var imgArr = img2HtmlArr.map(function(item){
		return item.link
	})
	//css中所有的img路径
	var img2CssArr = readImg2Css(css2HtmlArr);

	imgArr = imgArr.concat(img2CssArr);

	//cortex.js中依赖的js
	var jsArr = readJson(fileStream);

	var maps = concatArr(cssArr, imgArr, jsArr, htmlArr);

	// var cachename = file.replace("html","appcache");

	//writeFile(cachename, maps)
	var data = "CACHE MANIFEST\n";

	maps.forEach(function(item){
		data += item + "\n";
	})

	data += "NETWORK:\n*\n"

	return new Buffer(data);


}

function readImg2Css(arr){
	var imgArr = [], imgStrArr = [];
	arr.forEach(function(cssItem){
		
		if(cssItem.type == "modfile"){
			return ;
		}


		var csslink = "",
			cssLinkArr = cssItem.path.split("/");

		for(var i = 0; i< cssLinkArr.length; i++){
			if(cssLinkArr[i] != ".."){
				csslink += "/" + cssLinkArr[i];
			}
		}

		var cssStream = fs.readFileSync(rootPath + csslink,"utf-8");
		var imgSrcArr = cssStream.match(bgHrefRxg);

		makeArray(imgSrcArr).forEach(function(item){

			var imgPath = bgSrcRxg.exec(item)[1];
			if (!path.isAbsolute(imgPath)) {
				imgPath = path.join(path.dirname(cssItem.path), imgPath);
			}
			if(imgArr.indexOf(imgPath) == -1){
				imgArr.push(imgPath);
			}
		})
	})

	makeArray(imgArr).forEach(function(item){
		imgStrArr.push("{{{static '" + item + "'}}}");
	})

	return imgStrArr;
}

function makeHtmlArr(filePath){
	var arr = [];
	var htmlStr = "./"+path.basename(filePath);
	arr.push(htmlStr);
	arr.push(autoUpdate(htmlStr));
	return arr;
}

function autoUpdate(str){
	return str+"?"+new Date().getTime();
}



function readJson(stream){

	

	var jsArr = [];
	var dependencies = JSON.parse(fs.readFileSync(rootPath+"/cortex.json","utf-8")).dependencies;

	for(var i in dependencies){
		jsArr.push("{{{modfile '" + i + "'}}}");
	}

	return jsArr;

}

function concatArr(){

	var arr = []
	for(var i = 0 ;i < arguments.length; i++){
		arr = arr.concat(arguments[i]);
	}

	return arr;

}

function readLink(arr){
	
	var newArr = [];

	makeArray(arr).forEach(function(item){
		var match = hrefRxg.exec(item);
		if(!match)
			return;
		var nameArr = match[2].split("/"),
			name = nameArr[nameArr.length - 1];
		newArr.push({"link": match[0], "path": match[2], "name": name,"type":match[1]});
	})
	return newArr;

}

function test () {

	

}


module.exports =  readHTMLFile;

