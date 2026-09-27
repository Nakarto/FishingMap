export type Category = 'shop' | 'boat' | 'bait' | 'fishing';

export type Spot = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  level: Category;
  water: string;
  desc: string;
  fish: string[];
};
