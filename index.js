var fs = require("fs");
var makeArray = require("make-array");
var  argv =  process.argv;
var rootPath = process.cwd();
var path =  require("path");
// var compiler = require('cortex-handlebars-compiler');

var DIR_NANME;
var cssLinkRxg = /<link\s+(?:rel\=[\"\']stylesheet[\"\']\s+)?(?:type\=[\"\']text\/css[\"\']\s+)?href\=[\"\']\{{3}([\w\.\/\'\"\s\-]+)\}{3}[\"\']\s*\/>/g,
	hrefRxg = /\{{3}\s*(static|modfile)\s*[\'\"]([\w\.\/\s\-]+)[\'\"]\s*\}{3}/,
	imgHrefRxg = /<img\s+src\=[\'\"]\{{3}(static|modfile)\s+[\'\"]([\w\.\/\'\"\s\-]+)[\'\"]\s*\}{3}[\'\"]\s*\/>/g,
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

	//html中的js路径
	//var js2HtmlArr = makeJsArr(file,filePath);

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

	//cortex.js中依赖的js，外部资源和html中的js路径
	var jsArr = concatArr(readJson(), makeJsArr(file,filePath));

	var maps = concatArr(cssArr, imgArr, jsArr, htmlArr);

	var cachename = file.replace("html","appcache");

	//writeFile(cachename, maps)
	
	var data = "CACHE MANIFEST\n";

	maps.forEach(function(item){
		data += item + "\n";
	})

	data += "NETWORK:\n*\n";

	return new Buffer(data);


}

function readImg2Css(arr){
	var imgArr = [], imgStrArr = [];

	arr.forEach(function(item){
		
		if(item.type == "modfile"){
			return ;
		}


		var csslink = "",
			cssLinkArr = item.path.split("/");

		for(var i = 0; i< cssLinkArr.length; i++){
			if(cssLinkArr[i] != ".."){
				csslink += "/" + cssLinkArr[i];
			}
		}

		var cssStream = fs.readFileSync(rootPath + csslink,"utf-8");
		var imgSrcArr = cssStream.match(bgHrefRxg);

		makeArray(imgSrcArr).forEach(function(item){

			if(imgArr.indexOf(bgSrcRxg.exec(item)[1]) == -1){

				imgArr.push(transformImgPath(bgSrcRxg.exec(item)[1], cssLinkArr));

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

function makeJsArr(fileStream,filePath) {

	if(!fileStream.match(jsSrcRxg)){
		return;
	}
 
	var jsLink = fileStream.match(jsSrcRxg)[2];

	var js2HtmlArr = jsLink.split("/"),
		htmlPathArr = filePath.split("/"),
		rootPathArr = rootPath.split("/");

	var relativePathArr = [];
	var relativeJsPathArr = [];

	htmlPathArr.forEach(function(item){
		if(rootPathArr.indexOf(item) == -1){
			relativePathArr.push(item);
		}
	});

	js2HtmlArr.forEach(function(item){

		if(rootPathArr.indexOf(item) == -1){
			relativeJsPathArr.push(item);
		}

	})

	var num = relativePathArr.length 

	if(num == 1){
		relativeJsPathArr.splice(".");
	}else{
		for(var i = 1; i < relativePathArr.length; i++ ){
			relativeJsPathArr.splice(0, 0, "..");
		}
	}

	return "{{{static '" + relativeJsPathArr.join("/") + ".js'}}}";


}



function readJson(){

	var cortexArr = [];
	var cortexJson = JSON.parse(fs.readFileSync(rootPath+"/cortex.json","utf-8"))
	var dependencies = cortexJson.dependencies;
	var quoteResource = cortexJson.quoteResource || [];
	
	for(var i in dependencies){
		cortexArr.push("{{{modfile '" + i + "'}}}");
	}

	for(var j = 0; j < quoteResource.length; j++){

		cortexArr.push(quoteResource[j]);

	}

	return cortexArr;

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
			return ;
		var nameArr = match[2].split("/"),
			name = nameArr[nameArr.length - 1];
		newArr.push({"link": match[0], "path": match[2], "name": name,"type":match[1]});
	})
	return newArr;

}

function transformImgPath(imgpath, csspath) {

	var imgPathArr = imgpath.split("/");


	if(imgPathArr[0] !== ".."){

		if(imgPathArr[1] == ".."){
			var cssArr = [],imgArr = [];

			imgPathArr.splice(0, 1);

			for(var i = csspath.length; i > 0; i--){

				if(!/^([\w\/\s\-]+)\.css$/.test(csspath[i - 1])){
					cssArr.push(csspath[i - 1]);
				}

			}

			for(var i = 0; i < imgPathArr.length; i++){
				if(imgPathArr[0] == ".."){
					cssArr.splice(0, 1);
					imgPathArr.splice(0,1);
				}

			}

			imgArr = concatArr(cssArr.reverse(), imgPathArr);

			return imgArr.join("/");

		}else{
			imgPathArr[0] == "." ? imgPathArr.splice(0,1) : function() {};

			for(var i = csspath.length ; i > 0; i--){

				if(!/^([\w\/\s\-]+)\.css$/.test(csspath[i - 1])){
					imgPathArr.splice(0,0,csspath[i - 1]);
				}

			}

			return imgPathArr.join("/");
		}

	}else{

		var cssArr = [],imgArr = [];

		for(var i = csspath.length; i > 0; i--){

			if(!/^([\w\/\s\-]+)\.css$/.test(csspath[i - 1])){
				cssArr.push(csspath[i - 1]);
			}

		}

		for(var i = 0; i < imgPathArr.length; i++){
			if(imgPathArr[0] == ".."){
				cssArr.splice(0, 1);
				imgPathArr.splice(0,1);
			}

		}

		imgArr = concatArr(cssArr.reverse(), imgPathArr);

		return imgArr.join("/")

	}

}

module.exports =  readHTMLFile;