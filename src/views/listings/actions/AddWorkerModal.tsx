import {
  CButton,
  CCol,
  CForm,
  CInput,
  CInvalidFeedback,
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

interface ICancelWorkerPermission {
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

const AddWorkerPermission = (props: ICancelWorkerPermission) => {
  const { visible, setVisible } = props;
  const closeModal = (key: boolean) => (): void => setVisible(key);

  const initialValues = {
    address: '',
  };

  const validationSchema = Yup.object().shape({
    address: Yup.string().required('Địa chỉ ví không hợp lệ'),
  });

  return (
    <CModal show={visible} onClose={closeModal(false)} closeOnBackdrop={false} centered className="border-radius-modal">
      <CModalHeader className="justify-content-center">
        <CModalTitle className="modal-title-style">Thêm quyền khai thác</CModalTitle>
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
                  <p>Address Wallet</p>
                </CCol>
                <CCol xs={12}>
                  <CInput
                    type="text"
                    id="address"
                    name="address"
                    onChange={handleChange}
                    autoComplete="off"
                    value={values.address || ''}
                    onBlur={handleBlur}
                    className="btn-radius-50"
                  />
                  <CInvalidFeedback className={!!errors.address && touched.address ? 'd-block' : 'd-none'}>
                    {errors.address}
                  </CInvalidFeedback>
                </CCol>
              </CRow>
            </CModalBody>
            <CModalFooter className="justify-content-between">
              <CCol>
                <CButton
                  className="px-2 w-100 btn-font-style btn btn-outline-primary btn-radius-50"
                  onClick={closeModal(false)}
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

export default AddWorkerPermission;