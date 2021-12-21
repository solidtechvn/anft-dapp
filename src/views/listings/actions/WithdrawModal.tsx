import {
  CButton,
  CCol,
  CForm,
  CFormGroup,
  CInput,
  CInvalidFeedback,
  CLabel,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react';
import { Formik } from 'formik';
import React from 'react';
import * as Yup from 'yup';

interface IWithdrawTokenModal {
  isVisible: boolean;
  setVisibility: (visible: boolean) => void;
}

const WithdrawTokenModal = (props: IWithdrawTokenModal) => {
  const { isVisible, setVisibility } = props;
  const closeModal = () => (): void => setVisibility(false);

  const initialValues = {
    totalToken: 10000,
    totalTokenRecharged: 5000,
    maxTokenWithdraw: 1000,
    tokenWithdraw: 0,
  };

  const validationSchema = Yup.object().shape({
    tokenWithdraw: Yup.number().required('Vui lòng nhập số token muốn rút'),
  });

  return (
    <CModal show={isVisible} onClose={closeModal()} centered className="border-radius-modal">
      <CModalHeader className="justify-content-center">
        <CModalTitle className="modal-title-style">Rút ANFT</CModalTitle>
      </CModalHeader>
      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={(values) => {}}
      >
        {({ values, errors, touched, handleChange, handleSubmit, handleBlur }) => (
          <CForm onSubmit={handleSubmit}>
            <CModalBody>
              <CRow>
                <CCol xs={12}>
                  <CFormGroup row>
                    <CCol xs={8}>
                      <CLabel className="withdraw-token-title">Số ANFT bạn đã nạp</CLabel>
                    </CCol>
                    <CCol xs={4}>
                      <p className="text-primary text-right">{values.totalTokenRecharged}</p>
                    </CCol>
                  </CFormGroup>
                  <CFormGroup row>
                    <CCol xs={8}>
                      <CLabel className="withdraw-token-title">Số ANFT Tối đa bạn rút</CLabel>
                    </CCol>
                    <CCol xs={4}>
                      <p className="text-primary text-right">{values.maxTokenWithdraw}</p>
                    </CCol>
                  </CFormGroup>
                  <CFormGroup row>
                    <CCol xs={12}>
                      <CLabel className="withdraw-token-title">Số ANFT muốn rút</CLabel>
                    </CCol>
                    <CCol>
                      <CInput
                        onChange={handleChange}
                        id="tokenWithdraw"
                        autoComplete="off"
                        name="tokenWithdraw"
                        value={values.tokenWithdraw || ''}
                        onBlur={handleBlur}
                        className="btn-radius-50"
                        type="number"
                      />
                      <CInvalidFeedback
                        className={!!errors.tokenWithdraw && touched.tokenWithdraw ? 'd-block' : 'd-none'}
                      >
                        {errors.tokenWithdraw}
                      </CInvalidFeedback>
                    </CCol>
                  </CFormGroup>
                </CCol>
              </CRow>
            </CModalBody>
            <CModalFooter className="justify-content-between">
              <CCol>
                <CButton
                  className="px-2 w-100 btn-font-style btn btn-outline-primary btn-radius-50"
                  onClick={closeModal()}
                >
                  HỦY
                </CButton>
              </CCol>
              <CCol>
                <CButton className="px-2 w-100 btn btn-primary btn-font-style btn-radius-50" type="submit">
                  ĐỒNG Ý
                </CButton>
              </CCol>
            </CModalFooter>
          </CForm>
        )}
      </Formik>
    </CModal>
  );
};

export default WithdrawTokenModal;