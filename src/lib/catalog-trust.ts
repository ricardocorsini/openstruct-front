/** Public roots reviewed against openstruct-catalog@98c6d39259e4cd04d9d2af4df5ee0113a482b31b.
 * Source: distribution.json and catalog/trust.json. Never load trust from the remote envelope.
 */
export const CATALOG_URL =
  'https://raw.githubusercontent.com/ricardocorsini/openstruct-catalog/main/catalog.signed.json';

export const PRODUCT_POLICIES = {
  consolostruct: {
    sourceRepo: 'ricardocorsini/consolo-struct',
    releaseRepo: 'ricardocorsini/consolo-struct',
    tagPrefix: 'v',
    keyId: 'consolostruct-packages-v1',
  },
  molastruct: {
    sourceRepo: 'ricardocorsini/mola-struct',
    releaseRepo: 'ricardocorsini/mola-struct',
    tagPrefix: 'v',
    keyId: 'molastruct-packages-v1',
  },
  armadurastruct: {
    sourceRepo: 'ricardocorsini/armadura-struct',
    releaseRepo: 'ricardocorsini/openstruct-catalog',
    tagPrefix: 'armadurastruct-v',
    keyId: 'launcher-packages-v1',
  },
  geosptstruct: {
    sourceRepo: 'itanervale/GEOSPT-STRUCT',
    releaseRepo: 'ricardocorsini/openstruct-catalog',
    tagPrefix: 'geosptstruct-v',
    keyId: 'launcher-packages-v1',
  },
  geostruct: {
    sourceRepo: 'ricardocorsini/geo-struct',
    releaseRepo: 'ricardocorsini/openstruct-catalog',
    tagPrefix: 'geostruct-v',
    keyId: 'launcher-packages-v1',
  },
  kstruct: {
    sourceRepo: 'ricardocorsini/k-struct',
    releaseRepo: 'ricardocorsini/openstruct-catalog',
    tagPrefix: 'kstruct-v',
    keyId: 'launcher-packages-v1',
  },
} as const;

export type CatalogProductId = keyof typeof PRODUCT_POLICIES;
export const CATALOG_IDS = Object.keys(PRODUCT_POLICIES) as CatalogProductId[];
export type CatalogTrust = {
  catalogKeyId: string;
  keys: Readonly<Record<string, string>>;
};
export const CATALOG_TRUST: CatalogTrust = {
  catalogKeyId: 'catalog-v1',
  keys: {
    'catalog-v1': 'pvQL4rdeFWW/T+uG4ObGiZalkc+PF70CakS0Kt/0Hq4=',
    'molastruct-packages-v1': 'Z4awIRyFBb4v5KNh2FyqICIPkIIkY7Jf1qJfaORHT1U=',
    'consolostruct-packages-v1': 'EcKYvaqUSR7jZa8oNUZKkrQA90tlyhjuBCTaMbR0UA8=',
    'launcher-packages-v1': '8vw4JME6xKS73F+I03HEqBmsInB1oGTWJlhFyT6BCnI=',
  },
};
