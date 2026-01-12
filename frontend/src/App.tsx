import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ItemDetail from "./pages/ItemDetail";
import ItemNew from "./pages/ItemNew";
import Bins from "./pages/Bins";
import BinDetail from "./pages/BinDetail";
import BinNew from "./pages/BinNew";
import Nodes from "./pages/Nodes";
import NodeNew from "./pages/NodeNew";
import Scanner from "./pages/Scanner";
import Home from "./pages/Home";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/items/new" element={<ItemNew />} />
          <Route path="/items/:id" element={<ItemDetail />} />
          <Route path="/bins" element={<Bins />} />
          <Route path="/bins/new" element={<BinNew />} />
          <Route path="/bins/:id" element={<BinDetail />} />
          <Route path="/nodes" element={<Nodes />} />
          <Route path="/nodes/new" element={<NodeNew />} />
          <Route path="/scanner" element={<Scanner />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
