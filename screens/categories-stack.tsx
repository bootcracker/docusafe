import {createStackNavigator} from "@react-navigation/stack";
import CategoriesScreen from "./CategoriesScreen";
import CategoriaDetail from "./categoria-detail";

const Stack = createStackNavigator();

const CategoriesStack = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="CategoriesHome" component={CategoriesScreen} />
      <Stack.Screen name="CategoriaDetail" component={CategoriaDetail} />
    </Stack.Navigator>
  );
};

export default CategoriesStack;
