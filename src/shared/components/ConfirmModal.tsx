import { CButton, CCol, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../reducers';

interface IConfirmModal {
  color: 'danger' | 'success' | 'info' | 'warning' | 'primary';
  title: string;
  content?: string;
  isVisible: boolean;
  onConfirm: () => void;
  onAbort: (visible: boolean) => void;
  CustomJSX?: () => JSX.Element;
  hideFooter?: boolean;
  disableCloseBackdrop?: boolean;
}

const ConfirmModal = (props: IConfirmModal) => {
  const { color, title, content, isVisible, onConfirm, CustomJSX, onAbort, hideFooter, disableCloseBackdrop } = props;

  return (
    <CModal
      show={isVisible}
      onClose={onAbort}
      centered
      className="border-radius-modal"
      closeOnBackdrop={!disableCloseBackdrop}
    >
      <CModalHeader className="justify-content-center">
        <CModalTitle className="modal-title-style">{title}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className={`lead`}>{content}</p>
        {CustomJSX ? <CustomJSX /> : ''}
      </CModalBody>
      {!hideFooter ? (
        <CModalFooter className="justify-content-between">
          <CCol>
            <CButton
              className={`px-2 w-100 btn btn-${color} btn-font-style btn-radius-50`}
              type="submit"
              onClick={onConfirm}
            >
              XÁC NHẬN
            </CButton>
          </CCol>
          <CCol>
            <CButton className={`px-2 w-100 btn-font-style btn-radius-50 btn btn-outline-${color}`} onClick={onAbort}>
              HỦY
            </CButton>
          </CCol>
        </CModalFooter>
      ) : (
        ''
      )}
    </CModal>
  );
};

export default ConfirmModal;
