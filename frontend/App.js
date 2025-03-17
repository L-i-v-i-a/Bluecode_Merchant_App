import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Register from './screens/Register'; 
import Login from './screens/Login';
import RegisterMerchant from './screens/RegisterMerchant';
import Verification from './screens/Verification';
import Forgot from './screens/Forgot';
import Reset from './screens/Reset';
import Profile from "./screens/Profile"
import Merchant from './screens/Merchant';
import Dashboard from './screens/Dashboard';
import EditMerchantScreen from './screens/EditMerchant';
import CreateBranchScreen from './screens/Branch';
import BranchDetailsScreen from './screens/ViewBranch';
import EditBranchScreen from './screens/EditBranch';
import DashboardScreen from './screens/PayDash';
import RegisterAuthorizationScreen from './screens/RegisterAuthorization';
import TransactionsPage from './screens/TransactionsPage';
import Welcome from './screens/Welcome';
import Splash from './screens/Splash';
import PaymentPage from './screens/MakePayments';
import CreateBluescanApp from './screens/CreateBlueScan';
import QrCode from './screens/QrCode';
import CancelPayments from './screens/CancelPayments';
import BlueScan from './screens/BlueScan';
import EditBlueScan from './screens/EditBlueScan';
import VirtualCardScreen from "./screens/VirtualCards.js"
import DepositScreen from './screens/Deposit';
import WalletScreen from './screens/Wallet';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
        <Stack.Navigator initialRouteName={"Splash"}>
        <Stack.Screen name="Deposit" component={DepositScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ViewBlueScan" component={BlueScan} options={{ headerShown: false }} />
        <Stack.Screen name="EditBluescan" component={EditBlueScan} options={{ headerShown: false }} />
        <Stack.Screen name="BlueScan" component={CreateBluescanApp} options={{ headerShown: false }} />
        <Stack.Screen name="CancelPayment" component={CancelPayments} options={{ headerShown: false }} />
        <Stack.Screen name="VirtualCards" component={VirtualCardScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Wallet" component={WalletScreen} options={{ headerShown: false }} />
        <Stack.Screen name="QrCode" component={QrCode} options={{ headerShown: false }} />
        <Stack.Screen name="MakePayments" component={PaymentPage} options={{ headerShown: false }} />
        <Stack.Screen name="Welcome" component={Welcome} options={{ headerShown: false }} />
        <Stack.Screen name="Splash" component={Splash} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
        <Stack.Screen name="Verification" component={Verification} options={{ headerShown: false }} />
        <Stack.Screen name="Forgot" component={Forgot} options={{ headerShown: false }} />
        <Stack.Screen name="Reset" component={Reset} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={Profile} options={{ headerShown: false }} />
        <Stack.Screen name="MerchantReg" component={RegisterMerchant} options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard" component={Dashboard} options={{ headerShown: false }} />
        <Stack.Screen name="BusinessInfo" component={Merchant} options={{ headerShown: false }} />
        <Stack.Screen name="Branch" component={CreateBranchScreen} options={{headerShown: false}}/>
        <Stack.Screen name="UpdateBus" component={EditMerchantScreen} options={{ headerShown: false }} />
        <Stack.Screen name="BranchDetails" component={BranchDetailsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PayDash" component={DashboardScreen} options={{ headerShown: false }} />
        <Stack.Screen name="EditBranch" component={EditBranchScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RegAuth" component={RegisterAuthorizationScreen} options={{ headerShown: false }} />
        <Stack.Screen name='TransactionsPage' component={TransactionsPage} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
