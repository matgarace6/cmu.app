import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";

// IMPORTACIONES (Sin llaves { } para que coincidan con export default)
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page"; 
import Laundry from "@/pages/Laundry";
import Gym from "@/pages/Gym";
import Dining from "@/pages/Dining";
import KitchenView from "@/pages/KitchenView";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/laundry" component={Laundry} />
      <ProtectedRoute path="/gym" component={Gym} />
      <ProtectedRoute path="/dining" component={Dining} />
      <Route path="/kitchen" component={KitchenView} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;