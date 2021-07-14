import { useState, useRef, useMemo } from 'react';
import axios, { AxiosResponse, CancelTokenSource, AxiosRequestConfig } from 'axios';
const source = axios.CancelToken.source();
const CancelMessage = 'CancelMessage';

export interface UploadFile {
  target: File;
  url: string;
  uploadedStatus: {
    isCompleted: boolean;
    response?: any;
    status?: number;
  };
}

interface UploadActions {
  addUploadFiles: (file: File[] | File) => void;
  onCancelUpload: () => void;
}

interface UploadState {
  uploadFiles: UploadFile[];
  uploadingFile: UploadFile | undefined;
  percent: number;
  uploadActions: UploadActions;
}
interface UploadOptions {
  onFileUploaded?: (file: UploadFile, files: UploadFile[]) => void;
  onBeforeUpload?: (file: UploadFile, files: UploadFile[]) => AxiosRequestConfig;
  onUploadProgress?: (file: UploadFile, files: UploadFile[], progress: number) => void;
}

function generateUploadFile(file: File): UploadFile {
  return {
    target: file,
    url: '',
    uploadedStatus: {
      isCompleted: false,
    },
  };
}

export const useUpload: (options?: UploadOptions) => UploadState = (options) => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [percent, setPercent] = useState(0);
  const [uploadingFile, setUploadingFile] = useState<UploadFile>();
  const cancelRef = useRef<{
    isCanceld?: boolean;
    source: CancelTokenSource;
  }>({ source });
  const uploadActions = useMemo(() => {
    const addUploadFiles = (_files: File[] | File) => {
      const files = _files instanceof Array ? _files : [_files];
      const allFiles = [...uploadFiles, ...files.map(generateUploadFile)];
      cancelRef.current.isCanceld = false;
      setUploadFiles(allFiles);
      onStartUpload(allFiles);
    };

    const onStartUpload = (_files: UploadFile[]) => {
      if (cancelRef.current.isCanceld) {
        return;
      }
      const files = _files.slice();
      const activeIndex = files.findIndex((f) => !f.uploadedStatus.isCompleted);
      const activeFile = files[activeIndex];
      setUploadingFile(activeFile);
      if (activeIndex === -1) {
        return;
      }

      const config = (options && options.onBeforeUpload && options.onBeforeUpload(activeFile, files)) || {};

      const requestConfig: AxiosRequestConfig = {
        url: activeFile.url,
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-File-Name': encodeURIComponent(activeFile.target.name),
          'Content-Type': 'application/octet-stream',
        },
        data: activeFile.target,
        ...config,
      };
      axios({
        ...requestConfig,
        onUploadProgress: (e) => {
          setPercent(e.loaded / e.total);
          options && options.onUploadProgress && options.onUploadProgress(activeFile, files, e.loaded / e.total);
        },

        cancelToken: cancelRef.current.source.token,
      })
        .then((response) => {
          onFileUploaded({ files, activeIndex, activeFile, response });
        })
        .catch((error) => {
          if (error.message === CancelMessage) {
            return;
          }
          onFileUploaded({
            files,
            activeIndex,
            activeFile,
            response: error.response,
          });
        });
    };

    const onFileUploaded = (props: {
      files: UploadFile[];
      activeFile: UploadFile;
      activeIndex: number;
      response: AxiosResponse<any>;
    }) => {
      const { files, activeIndex, activeFile, response } = props;
      activeFile.uploadedStatus = {
        isCompleted: true,
        response: response.statusText,
        status: response.status,
      };
      files[activeIndex] = activeFile;
      setUploadFiles(files);
      onStartUpload(files);
      options && options.onFileUploaded && options.onFileUploaded(activeFile, files);
    };

    const onCancelUpload = () => {
      setUploadFiles([]);
      cancelRef.current.isCanceld = true;
      cancelRef.current.source.cancel(CancelMessage);
    };
    return { addUploadFiles, onCancelUpload, onStartUpload };
  }, [uploadFiles, options]);

  return {
    uploadFiles,
    uploadingFile,
    percent,
    uploadActions,
  };
};
