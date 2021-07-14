# an react hook of upload

## usage

### add file or files

```javascript
import { useUpload } from '@a417420427/use-upload';
const { uploadFiles, uploadingFile, percent, uploadActions } = useUpload();
uploadActions.addUploadFiles(file);
```

### set request config

```javascript
// return an AxiosRequestConfig
const onBeforeUpload = (file: UploadFile): AxiosRequestConfig => {
  return {
    url: 'requestUrl',
  };
};
const { uploadActions } = useUpload({
  onBeforeUpload,
});
```

### on file uploaded

```javascript
const onFileUploaded = (file: UploadFile, files: UploadFile[]) => {
  console.log(file.uploadedStatus, file.target);
};
const { uploadActions } = useUpload({
  onFileUploaded,
});
uploadActions.addUploadFiles(file);
```
