exports.handler = async (event, context) => {
  console.log('event');
  console.log(JSON.stringify(event,null,2));
  console.log('context');
  console.log(JSON.stringify(context,null,2));

  let boundary = getBoundary(event.headers["content-type"]);
  let buffer = new Buffer(event.body,'base64');
  let parts = Parse(buffer,boundary);
  let result = [];
  for(let idx=0;idx<parts.length;idx++){
    if(parts[idx].data && Buffer.isBuffer(parts[idx].data)){
      result.push({name:parts[idx].name,filename:parts[idx].filename,b64data: parts[idx].data.toString("base64")});
    }else{
      result.push({name:parts[idx].name,data: parts[idx].data});
    }
  }
  console.log(result);
  return result;
}


function Parse(multipartBodyBuffer,boundary){
	var process = function(part){
		// will transform this object:
		// { header: 'Content-Disposition: form-data; name="uploads[]"; filename="A.txt"',
		//	 info: 'Content-Type: text/plain',
		//	 part: 'AAAABBBB' }
		// into this one:
		// { filename: 'A.txt', type: 'text/plain', data: <Buffer 41 41 41 41 42 42 42 42> }
		var obj = function(str){
			var k = str.split('=');
			var a = k[0].trim();
			var b = JSON.parse(k[1].trim());
			var o = {};
			Object.defineProperty( o , a , 
			{ value: b, writable: true, enumerable: true, configurable: true })
			return o;
		}
		var header = part.header.split(';');

		if(part.fieldInfo != null && part.fieldInfo != ""){
			var field = obj(header[1]);
			Object.defineProperty( field , 'data' ,
				{ value: part.fieldInfo, writable: true, enumerable: true, configurable: true })
			return field;
		}
		var file = obj(header[2]);
		var contentType = part.info.split(':')[1].trim();		
		Object.defineProperty( file , 'type' , 
			{ value: contentType, writable: true, enumerable: true, configurable: true })
		Object.defineProperty( file , 'data' , 
			{ value: new Buffer(part.part), writable: true, enumerable: true, configurable: true })
		return file;
	}
	var prev = null;
	var lastline='';
	var header = '';
	var info = ''; var state=0; var buffer=[];
	var allParts = [];
	var fieldInfo = '';  // this will hold the field info when part is not a file.

	for(i=0;i<multipartBodyBuffer.length;i++){
		var oneByte = multipartBodyBuffer[i];
		var prevByte = i > 0 ? multipartBodyBuffer[i-1] : null;
		var newLineDetected = ((oneByte == 0x0a) && (prevByte == 0x0d)) ? true : false;
		var newLineChar = ((oneByte == 0x0a) || (oneByte == 0x0d)) ? true : false;

		if(!newLineChar)
			lastline += String.fromCharCode(oneByte);

		if((0 == state) && newLineDetected){
			if(("--"+boundary) == lastline){
				state=1;
			}
			lastline='';
		}else
		if((1 == state) && newLineDetected){
			header = lastline;
			state=2;
			lastline='';
		}else
		if((2 == state) && newLineDetected){
			info = lastline;
			state=3;
			lastline='';
		}else
		if((3 == state) && newLineDetected){
			fieldInfo = lastline; // fieldInfo is exposed in lastline on this step.
			state=4;
			buffer=[];
			lastline='';
		}else
		if(4 == state){
			if(lastline.length > (boundary.length+4)) lastline=''; // mem save
			if(((("--"+boundary) == lastline))){
				var j = buffer.length - lastline.length;
				var part = buffer.slice(0,j-1);
				var p = { header : header , info : info , part : part, fieldInfo : fieldInfo  };  // adding fieldInfo to the part to process
				allParts.push(process(p));
				buffer = []; lastline=''; state=5; header=''; info='';
			}else{
				buffer.push(oneByte);
			}
			if(newLineDetected) lastline='';
		}else
		if(5==state){
			if(newLineDetected)
				state=1;
		}
	}
	return allParts;
};

function getBoundary(header){
	var items = header.split(';');
	if(items)
		for(i=0;i<items.length;i++){
			var item = (new String(items[i])).trim();
			if(item.indexOf('boundary') >= 0){
				var k = item.split('=');
				return (new String(k[1])).trim();
			}
		}
	return "";
}