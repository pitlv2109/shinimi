function greet({context, entities}) {
    return new Promise(function(resolve, reject) {
      // Read greeings.txt, since it's not a big file, we use readFileSync
      var greetingsArr = fs.readFileSync('./text/greetings.txt').toString().split('\n');
      // Randomly choose a greetings
      context.greetings = greetingsArr[Math.floor(Math.random()*greetingsArr.length)];
      return resolve(context);
    });
};

exports.greet = greet;
