import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Search from './pages/Search';
import Items from './pages/Items';
import ItemDetail from './pages/ItemDetail';
import Bins from './pages/Bins';
import BinDetail from './pages/BinDetail';
import Nodes from './pages/Nodes';
import Scanner from './pages/Scanner';
import Home from './pages/Home';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/items" element={<Items />} />
          <Route path="/items/:id" element={<ItemDetail />} />
          <Route path="/bins" element={<Bins />} />
          <Route path="/bins/:id" element={<BinDetail />} />
          <Route path="/nodes" element={<Nodes />} />
          <Route path="/scanner" element={<Scanner />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

