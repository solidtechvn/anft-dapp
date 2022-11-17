import CIcon from '@coreui/icons-react';
import {
  CButton,
  CCol,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CForm,
  CHeader,
  CHeaderBrand,
  CHeaderNav,
  CHeaderNavItem,
  CInputCheckbox,
  CLabel,
  CLink,
  CRow,
  CTooltip
} from '@coreui/react';
import { faInfoCircle, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Formik, FormikProps } from 'formik';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Select from 'react-select';
import anftLogo from '../assets/img/ANT_logo_main_color.png';
import Logo from '../assets/img/logo.png';
import { TOKEN_INSTANCE } from '../shared/blockchain-helpers';
import { formatBNToken, getEllipsisTxt, moneyUnitTranslate } from '../shared/casual-helpers';
import { customStyles, mapAreaRange, mapFeeRange } from '../shared/components/FilterComponent';
import { ToastError, ToastInfo } from '../shared/components/Toast';
import { CommercialTypes } from '../shared/enumeration/comercialType';
import { Language } from '../shared/enumeration/language';
import { UnitRange, unitRangeArray } from '../shared/enumeration/unitRange';
import useDeviceDetect from '../shared/hooks/useDeviceDetect';
import { ISelectOption } from '../shared/models/selectOption.model';
import { RootState } from '../shared/reducers';
import {
  setFilterState as setStoredFilterState,
  softReset as assetsSoftReset
} from '../views/assets/assets.reducer';
import { logout, setLoginModalVisible } from '../views/auth/auth.reducer';
import { IAssetFilter, initialFilterValues } from '../views/listings/Listings';
import { getEntities as getListingTypes } from '../views/productType/category.api';
import { categorySelectors, fetching as fetchingListingType } from '../views/productType/category.reducer';
import { getDistrictsEntites, getProvincesEntites } from '../views/provinces/provinces.api';
import { softReset as transactionsSoftReset } from '../views/transactions/transactions.reducer';
import {
  getAddress,
  getContractWithSigner,
  getProviderLogin,
  getSigner,
  getTokenBalance
} from '../views/wallet/wallet.api';
import { resetSigner, softReset as walletSoftReset } from '../views/wallet/wallet.reducer';
import { toggleSidebar } from './reducer';

export const returnSelectOptions = (array: ISelectOption[], label: string) => {
  const defaultOption: ISelectOption = {
    value: undefined,
    label: label,
  };
  return [defaultOption, ...array];
};

const TheHeader = () => {
  const dispatch = useDispatch();
  const location = useLocation().pathname;
  const { isMobile } = useDeviceDetect();
  const isDashboardView = location.includes('/listings');
  const formikRef = useRef<FormikProps<IAssetFilter>>(null);

  const {
    getProviderLoginSuccess,
    getSignerSuccess,
    signer,
    signerAddress,
    provider,
    tokenBalance,
    errorMessage: walletErrorMessage,
  } = useSelector((state: RootState) => state.wallet);
  const { user } = useSelector((state: RootState) => state.authentication);
  const { provincesEntities, districtsEntities } = useSelector((state: RootState) => state.provinces);
  const { initialState: assetsInitialState } = useSelector((state: RootState) => state.assets);
  const { errorMessage: assetErrorMessage, filterState } = assetsInitialState;
  const { errorMessage: transactionErrorMessage } = useSelector((state: RootState) => state.transactions);
  const containerState = useSelector((state: RootState) => state.container);
  const { sidebarShow } = containerState;

  const { t, i18n } = useTranslation();

  const listingTypes = useSelector(categorySelectors.selectAll);
  const [chosenProvince, setChosenProvince] = useState<string>('');

  const onConnectWallet = () => {
    if (signerAddress) return dispatch(resetSigner());
    if (!provider) return ToastInfo('No provider found');
    dispatch(getProviderLogin(provider));
  };

  const toggleSidebarMobile = () => {
    const val = [false, 'responsive'].includes(sidebarShow) ? true : 'responsive';
    dispatch(toggleSidebar(val));
  };

  const toggleSidebarDesktop = () => {
    const val = [true, 'responsive'].includes(sidebarShow) ? false : 'responsive';
    dispatch(toggleSidebar(val));
  };

  useEffect(() => {
    if (transactionErrorMessage) {
      ToastError(transactionErrorMessage);
      dispatch(transactionsSoftReset());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionErrorMessage]);

  useEffect(() => {
    if (assetErrorMessage) {
      ToastError(assetErrorMessage);
      dispatch(assetsSoftReset());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetErrorMessage]);

  useEffect(() => {
    if (walletErrorMessage) {
      ToastError(walletErrorMessage);
      dispatch(walletSoftReset());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletErrorMessage]);

  useEffect(() => {
    if (getProviderLoginSuccess && provider) {
      dispatch(getSigner(provider));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getProviderLoginSuccess]);

  useEffect(() => {
    if (getSignerSuccess && signer) {
      const TokenContract = TOKEN_INSTANCE({ signer });
      if (!TokenContract) return;
      const body = { contract: TokenContract, signer };
      dispatch(getAddress(signer));
      dispatch(getContractWithSigner(body));
      dispatch(walletSoftReset());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSignerSuccess]);

  useEffect(() => {
    if (signerAddress && provider) {
      dispatch(getTokenBalance({ address: signerAddress, provider }));
    }
    formikRef.current?.resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signerAddress]);

  const handleRawValues = (values: IAssetFilter): IAssetFilter => {
    return {
      ...values,
      owner: Boolean(values.owner) ? signerAddress : undefined,
    };
  };

  const highlightNavItem = (path: string): 'c-active text-primary' | ' text-dark' => {
    if (path === '/') return ' text-dark';
    return location.includes(path) ? 'c-active text-primary' : ' text-dark';
  };

  const changeLanguageI18n = (lang: Language) => () => {
    i18n.changeLanguage(lang);
  };

  const [isDropdownFilterShowing, setIsDropdownFilterShowing] = useState<boolean>(false);

  useEffect(() => {
    dispatch(fetchingListingType());
    dispatch(getListingTypes());
    dispatch(getProvincesEntites({ country: 'VN' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chosenProvince) {
      dispatch(getDistrictsEntites({ province: chosenProvince }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosenProvince]);

  const multipleProvinceOption: ISelectOption[] = provincesEntities.map((province) => ({
    value: province?.code,
    label: province?.name,
  }));

  const multipleDistrictOption: ISelectOption[] = districtsEntities.length
    ? districtsEntities.map((district) => ({
        value: district?.code,
        label: district?.name,
      }))
    : [];

  const multipleListingTypeOption: ISelectOption[] = listingTypes?.length
    ? listingTypes.map((type) => ({
        value: type?.id,
        label: type?.name,
      }))
    : [];

  const commercialTypesOptions: ISelectOption[] = [
    { value: undefined, label: t(`anftDapp.headerComponent.filter.commercialTypes`) },
    { value: CommercialTypes.SELL, label: t(`anftDapp.listingComponent.methods.SELL`) },
    { value: CommercialTypes.RENT, label: t(`anftDapp.listingComponent.methods.RENT`) },
    { value: 'SELL,RENT', label: t(`anftDapp.listingComponent.methods.SELL_RENT`) },
  ];

  const qualityOptions: ISelectOption[] = [
    { value: undefined, label: t(`anftDapp.headerComponent.filter.quality`) },
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
    { value: 'C', label: 'C' },
    { value: 'D', label: 'D' },
  ];

  const orientationOptions: ISelectOption[] = [
    { value: undefined, label: t(`anftDapp.headerComponent.filter.orientation`) },
    { value: 'east', label: t(`anftDapp.headerComponent.filter.east`) },
    { value: 'west', label: t(`anftDapp.headerComponent.filter.west`) },
    { value: 'south', label: t(`anftDapp.headerComponent.filter.south`) },
    { value: 'north', label: t(`anftDapp.headerComponent.filter.north`) },
    { value: 'northEast', label: t(`anftDapp.headerComponent.filter.northEast`) },
    { value: 'northWest', label: t(`anftDapp.headerComponent.filter.northWest`) },
    { value: 'southWest', label: t(`anftDapp.headerComponent.filter.southWest`) },
    { value: 'southEast', label: t(`anftDapp.headerComponent.filter.southEast`) },
  ];

  const livingRoomOptions: ISelectOption[] = [
    { value: undefined, label: t(`anftDapp.headerComponent.filter.livingroom`) },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
  ];

  const bedRoomOptions: ISelectOption[] = [
    { value: undefined, label: t(`anftDapp.headerComponent.filter.bedroom`) },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
  ];

  const feeOptions = unitRangeArray.map((unit) => ({
    value: unit,
    label:
      unit === UnitRange.EXTREMELY_LOW
        ? `${t('anftDapp.global.moneyUnit.under')} ${Number(moneyUnitTranslate(mapFeeRange[unit].feeLte).number)} ${t(
            `anftDapp.global.moneyUnit.${moneyUnitTranslate(mapFeeRange[unit].feeLte).unit}`
          )}`
        : `${Number(moneyUnitTranslate(mapFeeRange[unit].feeGte).number)} ${t(
            `anftDapp.global.moneyUnit.${moneyUnitTranslate(mapFeeRange[unit].feeGte).unit}`
          )} - ${Number(moneyUnitTranslate(mapFeeRange[unit].feeLte).number)} ${t(
            `anftDapp.global.moneyUnit.${moneyUnitTranslate(mapFeeRange[unit].feeLte).unit}`
          )}`,
  }));

  const areaOptions: ISelectOption[] = unitRangeArray.map((unit) => ({
    value: unit,
    label:
      unit === UnitRange.EXTREMELY_LOW
        ? `${t('anftDapp.global.moneyUnit.under')} ${Number(mapAreaRange[unit].areaLte)} m2`
        : `${Number(mapAreaRange[unit].areaGte)} m2 - ${Number(mapAreaRange[unit].areaLte)} m2`,
  }));

  const handleReset = () => {
    formikRef.current?.resetForm();
    dispatch(setStoredFilterState(initialFilterValues))
    setIsDropdownFilterShowing(false);
  };

  return (
    <>
      <CHeader className="header-container d-block shadow-sm border-0" withSubheader>
        <div className="d-flex justify-content-between">
          <CHeaderNav className={`bg-white px-2`}>
            <CHeaderNavItem className={`${isMobile ? 'd-block' : 'd-block d-lg-none'}`}>
              <CButton className="text-primary p-0 border-0 d-lg-none" onClick={toggleSidebarMobile}>
                <CIcon name="cil-menu" size="xl" />
              </CButton>
              <CButton className="text-primary p-0 border-0 d-md-down-none" onClick={toggleSidebarDesktop}>
                <CIcon name="cil-menu" size="xl" />
              </CButton>
            </CHeaderNavItem>
            <CHeaderNavItem className={`ml-3`}>
              {isMobile ? (
                <CLink to="/listings">
                  <p className="header-title content-title mb-0">{t('anftDapp.headerComponent.dashboard')}</p>
                </CLink>
              ) : (
                <CHeaderBrand className="mx-auto " href="#/listings">
                  <img style={{ maxHeight: '40px' }} src={anftLogo} alt="" />
                </CHeaderBrand>
              )}
            </CHeaderNavItem>
          </CHeaderNav>
          <CHeaderNav className="px-2">
            <CHeaderNavItem className={`mr-3 ml-auto ${isMobile ? 'd-none' : 'd-none d-lg-block'}`}>
              <CLink to="/listings" className={`${highlightNavItem('/listings')} c-sidebar-nav-link`}>
                {t('anftDapp.headerComponent.dashboard')}
              </CLink>
            </CHeaderNavItem>
            <CHeaderNavItem className={`mr-3 ml-auto ${isMobile ? 'd-none' : 'd-none d-lg-block'}`}>
              <CLink to="/logs-overview" className={`${highlightNavItem('/logs-overview')}  c-sidebar-nav-link`}>
                {t('anftDapp.listingComponent.activityLogs')}
              </CLink>
            </CHeaderNavItem>
            <CHeaderNavItem className={`mr-3 ml-auto ${isMobile ? 'd-none' : 'd-none d-lg-block'}`}>
              <CLink
                href="https://dapp-guide.anfteco.io"
                target="_blank"
                rel="noreferrer noopener"
                className={`text-dark  c-sidebar-nav-link`}
              >
                {t('anftDapp.sidebarComponent.userGuide')}
              </CLink>
            </CHeaderNavItem>
            <CHeaderNavItem className={`mr-3 ml-auto ${isMobile ? 'd-none' : 'd-none d-lg-block'}`}>
              <CDropdown>
                <CDropdownToggle caret={false} className={`c-sidebar-nav-dropdown-toggle`}>
                  {t('anftDapp.sidebarComponent.language.language')}&nbsp;
                  <CIcon name="cil-chevron-circle-down-alt" />
                </CDropdownToggle>
                <CDropdownMenu>
                  <CDropdownItem
                    className={` ${i18n.language.includes(Language.vi) ? 'text-primary' : ''}`}
                    onClick={changeLanguageI18n(Language.vi)}
                  >
                    {t('anftDapp.sidebarComponent.language.vietnamese')}
                    <CIcon name="cif-vn" size="lg" className={`ml-1`} />
                  </CDropdownItem>
                  <CDropdownItem divider />
                  <CDropdownItem
                    className={` ${i18n.language.includes(Language.en) ? 'text-primary' : ''}`}
                    onClick={changeLanguageI18n(Language.en)}
                  >
                    {t('anftDapp.sidebarComponent.language.english')}
                    <CIcon name="cif-us" size="lg" className={`ml-1`} />
                  </CDropdownItem>
                </CDropdownMenu>
              </CDropdown>
            </CHeaderNavItem>
            {signerAddress && tokenBalance ? (
              <CHeaderNavItem className={`mr-3 ml-auto ${isMobile ? 'd-none' : 'd-none d-lg-block'}`}>
                <span className="text-primary">
                  <>
                    <CIcon src={Logo} height={30} />
                    <span className="mx-1">{formatBNToken(tokenBalance, false)}</span>
                    <CTooltip placement="top" content={t('anftDapp.listingComponent.extendOwnership.tokenBalance')}>
                      <FontAwesomeIcon icon={faInfoCircle} size="sm" />
                    </CTooltip>
                  </>
                </span>
              </CHeaderNavItem>
            ) : (
              ''
            )}
            <CHeaderNavItem className={`${isDashboardView ? 'mr-3 ml-auto' : 'ml-auto mr-lg-3'}`}>
              <CButton className="btn-link-wallet btn-radius-50 px-2 btn-font-style" onClick={onConnectWallet}>
                {signerAddress ? (
                  <b>
                    {getEllipsisTxt(signerAddress, 4)}{' '}
                    <CIcon name="cil-account-logout" size="lg" className="text-danger mx-0 my-0 pb-1" />
                  </b>
                ) : (
                  `${t('anftDapp.headerComponent.connectWallet')}`
                )}
              </CButton>
            </CHeaderNavItem>
            <CHeaderNavItem
              className={`${isDashboardView ? 'mr-3 ml-auto' : 'ml-auto mr-lg-3'} ${
                isMobile ? 'd-none' : 'd-none d-lg-block'
              }`}
            >
              {user ? (
                <CDropdown>
                  <CDropdownToggle caret={false} className={`c-sidebar-nav-dropdown-toggle px-0`}>
                    <div className={'btn-radius-50 btn-link-wallet px-2 py-1'}>
                      <CIcon name="cil-user" className="m-0 mb-1" />
                    </div>
                  </CDropdownToggle>
                  <CDropdownMenu>
                    <CDropdownItem className={'d-flex justify-content-between'} onClick={() => dispatch(logout())}>
                      <span>{user.login}</span>
                      <CIcon name="cil-account-logout" className="text-danger rotate-180" />
                    </CDropdownItem>
                  </CDropdownMenu>
                </CDropdown>
              ) : (
                <CButton
                  className={'btn-radius-50 btn-link-wallet'}
                  onClick={() => dispatch(setLoginModalVisible(true))}
                >
                  <CIcon name="cil-user" className="m-0 mb-1" />
                </CButton>
              )}
            </CHeaderNavItem>
            <CHeaderNavItem className={`${isDashboardView ? '' : 'd-none'} nav-item-filter`}>
              <CDropdown className={`dr-item-filter  ${isMobile ? '' : 'd-block d-lg-none'}`}>
                <CDropdownToggle
                  caret={false}
                  className="text-primary p-0 border-0"
                  onClick={() => setIsDropdownFilterShowing(true)}
                >
                  <CIcon name="cil-filter" size="xl" />
                </CDropdownToggle>
                <CDropdownMenu className="dr-menu-filter m-0 w-100" show={isDropdownFilterShowing}>
                  <Formik<IAssetFilter>
                    innerRef={formikRef}
                    initialValues={{ ...initialFilterValues, ...filterState }}
                    onSubmit={(rawValues) => {
                      const values = handleRawValues(rawValues);
                      try {
                        if (!provider) return;
                        dispatch(setStoredFilterState(values));
                        setIsDropdownFilterShowing(false);
                      } catch (error) {
                        console.log(`Error submitting form ${error}`);
                        ToastError(`${t('anftDapp.global.errors.errorSubmittingForm')}: ${error}`);
                      }
                    }}
                  >
                    {({ values, handleChange, handleSubmit, setFieldValue }) => (
                      <CForm onSubmit={handleSubmit}>
                        <div className="modal-title-style d-flex justify-content-end px-3 py-2">
                          <CLabel className="m-auto pl-3"> {t('anftDapp.headerComponent.filter.filter')}</CLabel>
                          <CButton className="p-0 text-primary" onClick={handleReset}>
                            <FontAwesomeIcon icon={faSyncAlt} size="lg" />
                          </CButton>
                        </div>
                        <CRow className="mx-2" onClick={(e) => e.nativeEvent.stopImmediatePropagation()}>
                          <CCol xs={6} md={4} className="px-2 text-center py-2">
                            <Select
                              key={`select-${JSON.stringify(multipleProvinceOption)}`}
                              className="filter-search-select btn-radius-50"
                              options={returnSelectOptions(
                                multipleProvinceOption,
                                t(`anftDapp.headerComponent.filter.provinceCode`)
                              )}
                              isMulti={false}
                              isSearchable={true}
                              value={
                                returnSelectOptions(
                                  multipleProvinceOption,
                                  t(`anftDapp.headerComponent.filter.provinceCode`)
                                )?.find((item) => item.value === values.provinceCode) as any
                              }
                              placeholder={t(`anftDapp.headerComponent.filter.provinceCode`)}
                              styles={customStyles}
                              onChange={(selected: any) => {
                                if (selected) {
                                  setChosenProvince(selected.value);
                                  setFieldValue('provinceCode', selected.value);
                                  setFieldValue('districtCode', undefined);
                                }
                              }}
                              noOptionsMessage={() => t('anftDapp.global.noItemText')}
                            />
                          </CCol>

                          <CCol xs={6} md={4} className="px-2 text-center py-2">
                            <Select
                              key={`select-${JSON.stringify(multipleDistrictOption)}`}
                              className="filter-search-select btn-radius-50"
                              options={returnSelectOptions(
                                multipleDistrictOption,
                                t(`anftDapp.headerComponent.filter.districtCode`)
                              )}
                              isMulti={false}
                              isSearchable={true}
                              value={
                                returnSelectOptions(
                                  multipleDistrictOption,
                                  t(`anftDapp.headerComponent.filter.districtCode`)
                                )?.find((item) => item.value === values.districtCode) as any
                              }
                              placeholder={t(`anftDapp.headerComponent.filter.districtCode`)}
                              styles={customStyles}
                              onChange={(selected: any) => {
                                if (selected) {
                                  setFieldValue('districtCode', selected.value);
                                }
                              }}
                              noOptionsMessage={() => t('anftDapp.global.noItemText')}
                            />
                          </CCol>

                          <CCol xs={6} md={4} className="px-2 text-center py-2">
                            <Select
                              key={`select-${JSON.stringify(multipleListingTypeOption)}`}
                              className="filter-search-select btn-radius-50"
                              options={returnSelectOptions(
                                multipleListingTypeOption,
                                t(`anftDapp.headerComponent.filter.type`)
                              )}
                              isMulti={false}
                              isSearchable={true}
                              value={
                                returnSelectOptions(
                                  multipleListingTypeOption,
                                  t(`anftDapp.headerComponent.filter.type`)
                                )?.find((item) => item.value === values.typeIds) as any
                              }
                              placeholder={t(`anftDapp.headerComponent.filter.type`)}
                              styles={customStyles}
                              onChange={(selected: any) => {
                                if (selected) {
                                  setFieldValue('typeIds', selected.value);
                                }
                              }}
                              noOptionsMessage={() => t('anftDapp.global.noItemText')}
                            />
                          </CCol>

                          <CCol xs={6} md={4} className="px-2 text-center py-2">
                            <Select
                              className="filter-search-select btn-radius-50"
                              options={commercialTypesOptions}
                              isMulti={false}
                              isSearchable={false}
                              placeholder={t(`anftDapp.headerComponent.filter.commercialTypes`)}
                              value={
                                commercialTypesOptions.find((item) => item.value === values.commercialTypes) as any
                              }
                              styles={customStyles}
                              onChange={(selected: ISelectOption) => {
                                if (selected) {
                                  setFieldValue('commercialTypes', selected?.value);
                                }
                              }}
                              noOptionsMessage={() => t('anftDapp.global.noItemText')}
                            />
                          </CCol>

                          <CCol xs={6} md={4} className="px-2 text-center py-2">
                            <Select
                              className="filter-search-select btn-radius-50"
                              options={returnSelectOptions(
                                feeOptions,
                                t(`anftDapp.headerComponent.filter.miningFeeRange`)
                              )}
                              isMulti={false}
                              isSearchable={false}
                              placeholder={t(`anftDapp.headerComponent.filter.miningFeeRange`)}
                              value={
                                returnSelectOptions(
                                  feeOptions,
                                  t(`anftDapp.headerComponent.filter.miningFeeRange`)
                                )?.find((item) => item.value === values.miningFeeRange) as any
                              }
                              styles={customStyles}
                              onChange={(selected: ISelectOption) => {
                                setFieldValue('miningFeeRange', selected?.value);
                                if (selected?.value) {
                                  const { feeGte, feeLte } = mapFeeRange[selected.value as UnitRange];
                                  setFieldValue('feeGte', feeGte);
                                  setFieldValue('feeLte', feeLte);
                                } else {
                                  setFieldValue('feeGte', undefined);
                                  setFieldValue('feeLte', undefined);
                                }
                              }}
                              noOptionsMessage={() => t('anftDapp.global.noItemText')}
                            />
                          </CCol>
                          <CCol xs={6} md={4} className="px-2 text-center py-2">
                            <Select
                              className="filter-search-select btn-radius-50"
                              options={returnSelectOptions(areaOptions, t(`anftDapp.headerComponent.filter.areaRange`))}
                              isMulti={false}
                              isSearchable={false}
                              placeholder={t(`anftDapp.headerComponent.filter.areaRange`)}
                              value={
                                returnSelectOptions(areaOptions, t(`anftDapp.headerComponent.filter.areaRange`))?.find(
                                  (item) => item.value === values.areaRange
                                ) as any
                              }
                              styles={customStyles}
                              onChange={(selected: ISelectOption) => {
                                setFieldValue('areaRange', selected?.value);
                                if (selected?.value) {
                                  const { areaGte, areaLte } = mapAreaRange[selected.value as UnitRange];
                                  setFieldValue('areaGte', areaGte);
                                  setFieldValue('areaLte', areaLte);
                                } else {
                                  setFieldValue('areaGte', undefined);
                                  setFieldValue('areaLte', undefined);
                                }
                              }}
                              noOptionsMessage={() => t('anftDapp.global.noItemText')}
                            />
                          </CCol>
                          <CCol xs={6} md={4} className="px-2 text-center py-2">
                            <Select
                              className="filter-search-select btn-radius-50"
                              options={qualityOptions}
                              isMulti={false}
                              isSearchable={false}
                              placeholder={t(`anftDapp.headerComponent.filter.quality`)}
                              value={qualityOptions.find((item) => item.value === values.quality) as any}
                              styles={customStyles}
                              onChange={(selected: ISelectOption) => {
                                if (selected) {
                                  setFieldValue('quality', selected?.value);
                                }
                              }}
                              noOptionsMessage={() => t('anftDapp.global.noItemText')}
                            />
                          </CCol>
                          <CCol xs={6} md={4} className="px-2 text-center py-2">
                            <Select
                              className="filter-search-select btn-radius-50"
                              options={orientationOptions}
                              isMulti={false}
                              isSearchable={false}
                              placeholder={t(`anftDapp.headerComponent.filter.orientation`)}
                              value={orientationOptions.find((item) => item.value === values.orientation) as any}
                              styles={customStyles}
                              onChange={(selected: ISelectOption) => {
                                if (selected) {
                                  setFieldValue('orientation', selected?.value);
                                }
                              }}
                              noOptionsMessage={() => t('anftDapp.global.noItemText')}
                            />
                          </CCol>
                          <CCol xs={6} md={4} className="px-2 text-center py-2">
                            <Select
                              className="filter-search-select btn-radius-50"
                              options={livingRoomOptions}
                              isMulti={false}
                              isSearchable={false}
                              placeholder={t(`anftDapp.headerComponent.filter.livingroom`)}
                              value={livingRoomOptions.find((item) => item.value === values.livingroom) as any}
                              styles={customStyles}
                              onChange={(selected: ISelectOption) => {
                                if (selected) {
                                  setFieldValue('livingroom', selected?.value);
                                }
                              }}
                              noOptionsMessage={() => t('anftDapp.global.noItemText')}
                            />
                          </CCol>
                          <CCol xs={6} md={4} className="px-2 text-center py-2">
                            <Select
                              className="filter-search-select btn-radius-50"
                              options={bedRoomOptions}
                              isMulti={false}
                              isSearchable={false}
                              placeholder={t(`anftDapp.headerComponent.filter.bedroom`)}
                              value={bedRoomOptions.find((item) => item.value === values.bedroom) as any}
                              styles={customStyles}
                              onChange={(selected: ISelectOption) => {
                                if (selected) {
                                  setFieldValue('bedroom', selected?.value);
                                }
                              }}
                              noOptionsMessage={() => t('anftDapp.global.noItemText')}
                            />
                          </CCol>

                          <CCol xs={12} md={4} className="py-3 d-flex align-items-end">
                            <CInputCheckbox
                              id="owner"
                              name="owner"
                              className="form-check-input m-0"
                              value={values.owner}
                              onChange={handleChange}
                              checked={Boolean(values.owner)}
                              disabled={!Boolean(signerAddress)}
                            />
                            <CLabel className="content-title pl-2 m-0">
                              {t('anftDapp.headerComponent.filter.owned')}
                            </CLabel>
                          </CCol>
                          <CCol xs={12} className="d-flex justify-content-center my-2">
                            <CButton className="btn-radius-50 text-anft-gradiant text-white" type="submit">
                              {t('anftDapp.headerComponent.filter.apply')}
                            </CButton>
                          </CCol>
                        </CRow>
                      </CForm>
                    )}
                  </Formik>
                </CDropdownMenu>
              </CDropdown>
            </CHeaderNavItem>
          </CHeaderNav>
        </div>
      </CHeader>
      {/* <CSubheader
        className={`${isDashboardView ? 'd-none' : 'd-none'} sub-header mt-2 justify-content-center align-items-center`}
      >
        <CRow className="w-100 p-1">
          <CCol xs={12}>
            <p className={`text-center alert alert-warning font-size-075`}>
              {t('anftDapp.headerComponent.demoNotice')}
            </p>
          </CCol>
          <CCol xs={4} className="px-2">
            <CSelect className="btn-radius-50 text-dark px-2 content-title" disabled>
              <option value="">{t('anftDapp.headerComponent.filter.type')}</option>
              {dataFilterDemo.map((e, i) => (
                <option value={e.value} key={`type-key-${i}`}>
                  {e.label}
                </option>
              ))}
            </CSelect>
          </CCol>
          <CCol xs={4} className="px-2">
            <CSelect className="btn-radius-50 text-dark px-2 content-title" disabled>
              <option value="">{t('anftDapp.headerComponent.filter.state')}</option>
              {dataFilterDemo.map((e, i) => (
                <option value={e.value} key={`state-key-${i}`}>
                  {e.label}
                </option>
              ))}
            </CSelect>
          </CCol>
          <CCol xs={4} className="px-2">
            <CSelect className="btn-radius-50 text-dark px-2 content-title" disabled>
              <option value="">{t('anftDapp.headerComponent.filter.services')}</option>
              {dataFilterDemo.map((e, i) => (
                <option value={e.value} key={`services-key-${i}`}>
                  {e.label}
                </option>
              ))}
            </CSelect>
          </CCol>
        </CRow>
      </CSubheader> */}
    </>
  );
};

export default TheHeader;
