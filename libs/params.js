import AWS from 'aws-sdk';

const ssm = new AWS.SSM();

const read = (name) =>
  new Promise((resolve, reject) => {
    ssm.getParameter(
      {
        Name: name,
        WithDecryption: true,
      },
      (err, data) => {
        if (err) {
          console.log(err, err.stack);
          reject(err);
        } else {
          const param = JSON.parse(data.Parameter.Value);
          resolve(param);
        }
      },
    );
  });

const params = {
  read
};

export default params;
