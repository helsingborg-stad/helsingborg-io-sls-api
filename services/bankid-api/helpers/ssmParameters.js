import AWS from "aws-sdk";

const ssm = new AWS.SSM();

export const getConfig = (name) =>
  new Promise((resolve, reject) => {
    ssm.getParameter(
      {
        Name: name,
        WithDecryption: true
      },
      (err, data) => {
        if (err) {
          console.log(err, err.stack);
          reject(err);
        } else {
          const param = JSON.parse(data.Parameter.Value)
          resolve(param);
        }
      }
    );
  });
