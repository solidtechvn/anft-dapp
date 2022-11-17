import CIcon from '@coreui/icons-react';
import { CButton, CCard, CCol, CCollapse, CForm, CRow } from '@coreui/react';
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Formik, FormikProps } from 'formik';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import Select, { CSSObjectWithLabel, OptionProps } from 'react-select';
import { returnSelectOptions } from '../../containers/TheHeader';
import { setFilterState as setStoredFilterState } from '../../views/assets/assets.reducer';
import { IAssetFilter, initialFilterValues } from '../../views/listings/Listings';
import { categorySelectors } from '../../views/productType/category.reducer';
import { getDistrictsEntites } from '../../views/provinces/provinces.api';
import { moneyUnitTranslate } from '../casual-helpers';
import { CommercialTypes } from '../enumeration/comercialType';
import { ExchangeType, exchangeTypeArray } from '../enumeration/exchangeType';
import { UnitRange, unitRangeArray } from '../enumeration/unitRange';
import { ISelectOption } from '../models/selectOption.model';
import { RootState } from '../reducers';
import { ToastError } from './Toast';

interface IMiningFeeRange {
  feeGte: number;
  feeLte: number;
}

interface IAreaRange {
  areaGte: number;
  areaLte: number;
}

export const mapFeeRange: { [key in UnitRange]: IMiningFeeRange } = {
  [UnitRange.EXTREMELY_LOW]: { feeGte: 0, feeLte: 1_000_000 },
  [UnitRange.VERY_LOW]: { feeGte: 1_000_000, feeLte: 3_000_000 },
  [UnitRange.LOW]: { feeGte: 3_000_000, feeLte: 5_000_000 },
  [UnitRange.MEDIUM]: { feeGte: 5_000_000, feeLte: 10_000_000 },
  [UnitRange.HIGH]: { feeGte: 10_000_000, feeLte: 20_000_000 },
  [UnitRange.VERY_HIGH]: { feeGte: 20_000_000, feeLte: 50_000_000 },
};

export const mapAreaRange: { [key in UnitRange]: IAreaRange } = {
  [UnitRange.EXTREMELY_LOW]: { areaGte: 0, areaLte: 10 },
  [UnitRange.VERY_LOW]: { areaGte: 10, areaLte: 50 },
  [UnitRange.LOW]: { areaGte: 50, areaLte: 100 },
  [UnitRange.MEDIUM]: { areaGte: 100, areaLte: 200 },
  [UnitRange.HIGH]: { areaGte: 200, areaLte: 300 },
  [UnitRange.VERY_HIGH]: { areaGte: 300, areaLte: 400 },
};

export const customStyles = {
  option: (provided: CSSObjectWithLabel, state: OptionProps) => ({
    ...provided,
    color: state.isSelected ? 'white' : '#3E4958',
    fontSize: '1rem',
    lineHeight: '19px',
    textAlign: 'left' as 'left',
  }),
  placeholder: (provided: CSSObjectWithLabel) => ({
    ...provided,
    color: '#3E4958',
    fontSize: '1rem',
    lineHeight: '19px',
    textAlign: 'left' as 'left',
  }),
  singleValue: (provided: CSSObjectWithLabel) => ({
    ...provided,
    color: '#3E4958',
    fontSize: '1rem',
    lineHeight: '19px',
    textAlign: 'left' as 'left',
  }),
  input: (provided: CSSObjectWithLabel) => ({
    ...provided,
    color: '#3E4958',
    fontSize: '1rem',
    lineHeight: '19px',
    textAlign: 'left' as 'left',
  }),
};

const FilterComponent = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const listingTypes = useSelector(categorySelectors.selectAll);
  const { provincesEntities, districtsEntities } = useSelector((state: RootState) => state.provinces);
  const { signerAddress, provider } = useSelector((state: RootState) => state.wallet);
  const { initialState } = useSelector((state: RootState) => state.assets);
  const { filterState } = initialState;

  const [advandedSearch, setAdvancedSearch] = useState<boolean>(false);
  const setAdvancedSearchListener = (key: boolean) => () => setAdvancedSearch(key);

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

  const ownershipOptions: ISelectOption[] = [
    { value: undefined, label: t(`anftDapp.headerComponent.filter.ownershipStatus`) },
    { value: '', label: t(`anftDapp.headerComponent.filter.yetOwned`) },
    {
      value: signerAddress || 'OWNED',
      label: t(`anftDapp.headerComponent.filter.owned`),
      isDisabled: Boolean(!signerAddress),
    },
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

  const formikRef = useRef<FormikProps<IAssetFilter>>(null);
  const [chosenProvince, setChosenProvince] = useState<string>('');

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

  const handleReset = () => {
    formikRef.current?.resetForm({ values: initialFilterValues });
    dispatch(setStoredFilterState(initialFilterValues));
  };

  useEffect(() => {
    if (chosenProvince) {
      dispatch(getDistrictsEntites({ province: chosenProvince }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosenProvince]);

  return (
    <CCard className={'shadow-0 border-0 w-100 mt-3 mb-0'}>
      <Formik<IAssetFilter>
        innerRef={formikRef}
        initialValues={{ ...initialFilterValues, ...filterState }}
        onSubmit={(values) => {
          try {
            if (!provider) return;
            dispatch(setStoredFilterState(values));
          } catch (error) {
            console.log(`Error submitting form ${error}`);
            ToastError(`${t('anftDapp.global.errors.errorSubmittingForm')}: ${error}`);
          }
        }}
      >
        {({ values, handleSubmit, setFieldValue }) => (
          <CForm onSubmit={handleSubmit}>
            <CCollapse show={advandedSearch}>
              <CRow className="mx-2 align-items-center">
                <CCol xs={12} sm={6} md={4} lg={3} className="px-2 text-center py-2">
                  <Select
                    className="filter-search-select btn-radius-50"
                    options={commercialTypesOptions}
                    isMulti={false}
                    isSearchable={false}
                    placeholder={t(`anftDapp.headerComponent.filter.commercialTypes`)}
                    value={commercialTypesOptions.find((item) => item.value === values.commercialTypes) as any}
                    styles={customStyles}
                    onChange={(selected: ISelectOption) => {
                      if (selected) {
                        setFieldValue('commercialTypes', selected?.value);
                      }
                    }}
                    noOptionsMessage={() => t('anftDapp.global.noItemText')}
                  />
                </CCol>

                <CCol xs={12} sm={6} md={4} lg={3} className="px-2 text-center py-2">
                  <Select
                    className="filter-search-select btn-radius-50"
                    options={returnSelectOptions(feeOptions, t(`anftDapp.headerComponent.filter.miningFeeRange`))}
                    isMulti={false}
                    isSearchable={false}
                    placeholder={t(`anftDapp.headerComponent.filter.miningFeeRange`)}
                    value={
                      returnSelectOptions(feeOptions, t(`anftDapp.headerComponent.filter.miningFeeRange`))?.find(
                        (item) => item.value === values.miningFeeRange
                      ) as any
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

                <CCol xs={12} sm={6} md={4} lg={3} className="px-2 text-center py-2">
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

                <CCol xs={12} sm={6} md={4} lg={3} className="px-2 text-center py-2">
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

                <CCol xs={12} sm={6} md={4} lg={3} className="px-2 text-center py-2">
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

                <CCol xs={12} sm={6} md={4} lg={3} className="px-2 text-center py-2">
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

                <CCol xs={12} sm={6} md={4} lg={3} className="px-2 text-center py-2">
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

                <CCol xs={12} sm={6} md={4} lg={3} className="px-2 text-center py-2">
                  <Select
                    className="filter-search-select btn-radius-50"
                    options={ownershipOptions}
                    isMulti={false}
                    isSearchable={false}
                    placeholder={t(`anftDapp.headerComponent.filter.ownershipStatus`)}
                    value={ownershipOptions.find((item) => item.value === values.owner) as any}
                    styles={customStyles}
                    onChange={(selected: ISelectOption) => {
                      if (selected) {
                        setFieldValue('owner', selected?.value);
                        setFieldValue(
                          'level',
                          selected?.value === '' ? ExchangeType.PRIMARY : exchangeTypeArray.join(',')
                        );
                      }
                    }}
                    noOptionsMessage={() => t('anftDapp.global.noItemText')}
                  />
                </CCol>
              </CRow>
            </CCollapse>

            <CRow className="mx-2 align-items-center">
              <CCol xs={12} sm={6} md={4} lg={3} className="px-2 text-center py-2">
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

              <CCol xs={12} sm={6} md={4} lg={3} className="px-2 text-center py-2">
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

              <CCol xs={12} sm={6} md={4} lg={3} className="px-2 text-center py-2">
                <Select
                  key={`select-${JSON.stringify(multipleListingTypeOption)}`}
                  className="filter-search-select btn-radius-50"
                  options={returnSelectOptions(multipleListingTypeOption, t(`anftDapp.headerComponent.filter.type`))}
                  isMulti={false}
                  isSearchable={true}
                  value={
                    returnSelectOptions(multipleListingTypeOption, t(`anftDapp.headerComponent.filter.type`))?.find(
                      (item) => item.value === values.typeIds
                    ) as any
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

              <CCol xs={12} sm={6} md={4} lg={3} className="px-2 d-flex align-items-center justify-content-end">
                <CButton size="lg" className="p-0 text-primary" onClick={handleReset}>
                  <FontAwesomeIcon icon={faSyncAlt} size="lg" />
                </CButton>
                <CButton
                  size="lg"
                  className="text-primary toggle-collapse-btn "
                  onClick={setAdvancedSearchListener(!advandedSearch)}
                >
                  <CIcon name={advandedSearch ? 'cil-fullscreen-exit' : 'cil-fullscreen'} size="lg" />
                </CButton>
                <CButton
                  className="btn btn-primary text-anft-gradiant border-0 btn-radius-50 px-4"
                  type="submit"
                  size="lg"
                >
                  {t('anftDapp.headerComponent.filter.filter')}
                </CButton>
              </CCol>
            </CRow>
          </CForm>
        )}
      </Formik>
    </CCard>
  );
};

export default FilterComponent;
