exports.handler = async (event, context) => {
  console.log('event');
  console.log(JSON.stringify(event,null,2));
  console.log('context');
  console.log(JSON.stringify(context,null,2));
  return event;
}