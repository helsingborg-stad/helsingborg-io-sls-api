# PDF generator microservice

This microservice generates pdfs from case data, and saves it (as a buffer) on the case. 

## Deployment
- First deploy the pdfTemplates resource in the helsingborg-io-sls-resources repo, so that the required S3 bucket exists. 

- Also deploy the updated dynamodb case database, to create a secondary index that this service uses. 

- Then to deploy it, just run yarn in the service folder, and then deploy with serverless as normal, sls deploy. 

In the folder templateExample there is two template files that exemplifies how the template system works, and a file 'templateFiles.json' that contains metadata about the templates. These should be put into the S3 bucket created above, named "pdf-case-templates-s3-{some-id}", for the generator to work. 

## The data flow

This service listens for events from the Case DynamoDB, and triggers on events where the status of a case is set to submitted. When that happens, this service takes that data, finds out what kind of case it is, and maps that to a given template. Then, using the template we fill out the data and then save the resulting pdf on the case, as a binary buffer under the property pdf. We also set a status, pdfGenerated, so that we only generate a pdf once per case. 

We also get all other cases for the user with the same formId, and compare the values to see what has changed. The changed values gets marked in red in the generated pdf. 

Currently, the service saves a copy of the pdf to the template-bucket under /cases/{caseId}, but this is for developmental purposes, to make it a bit easier to check that the pdf has been correctly generated. 


## The template system

This services uses a library that lets us render new text on top of an existing pdf, which is how the 'template system' works. The template data consists of this base pdf, and another data object: 
```typescript
export interface Template {
  numberOfPages: number;
  defaultFontSize: number;
  defaultFont?: Font;
  date?: string;

  textObjects: TextObject[];
}
```
For each string that we want to render, we have to specify a TextObject, which has the following shape: 
```typescript
interface TextObject {
  page?: number;
  x: number;
  y: number;
  fontSize?: number;
  font?: Font;
  color?: Color;
  text: string;
  valueId?:string
}
```
The x, y coordinates tells us where on the page to put the text, and has to be configured manually, depending on the base pdf. 
The text is what we want to write, and if we want to replace it with a dynamic value, we write (for example) {{ personalInfo.firstName }}, if we have a property in our case answers with id personalInfo.firstName. Multiple replacements can be combined in the same text, for example "{{firstName}} {{lastName}}" will be correctly replaced. 

We also have an optional valueId, which if given is used to check for changes: i.e. if this value has changed compared to last time, the text will be marked red. 

This system works, but it has to be made 'by hand' and is not all that nice, but as it turns out generating pdfs from markdown or html, while easy locally, is quite tricky to get running inside the lambda environment. 