import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Grid,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  CircularProgress
} from '@mui/material';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c', '#d0ed57'];

const App = () => {
  const [selectedMonth, setSelectedMonth] = useState("3");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [transactions, setTransactions] = useState({ data: [], total: 0, totalPages: 0 });
  const [statistics, setStatistics] = useState(null);
  const [barChartData, setBarChartData] = useState([]);
  const [pieChartData, setPieChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/transactions?month=${selectedMonth}&page=${currentPage}&perPage=10&search=${searchText}`
      );
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/statistics?month=${selectedMonth}`);
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchChartData = async () => {
    try {
      // Fetch bar chart data
      const barResponse = await fetch(`http://localhost:5000/api/bar-chart?month=${selectedMonth}`);
      const barData = await barResponse.json();
      setBarChartData(Object.entries(barData).map(([range, count]) => ({
        range,
        count
      })));

      // Fetch pie chart data
      const pieResponse = await fetch(`http://localhost:5000/api/pie-chart?month=${selectedMonth}`);
      const pieData = await pieResponse.json();
      setPieChartData(Object.entries(pieData).map(([category, value]) => ({
        name: category,
        value
      })));
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchTransactions(),
      fetchStatistics(),
      fetchChartData()
    ]).finally(() => setLoading(false));
  }, [selectedMonth, currentPage, searchText]);

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
    setCurrentPage(1);
  };

  const handleSearch = (event) => {
    setSearchText(event.target.value);
    setCurrentPage(1);
  };

  const CustomPieChartLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
      >
        {`${name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={"100vh"}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} >
      {/* Header Controls */}


      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Sale Amount
              </Typography>
              <Typography variant="h4">
                ${statistics?.totalSaleAmount?.toFixed(2) || '0.00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Sold Items
              </Typography>
              <Typography variant="h4">
                {statistics?.totalSoldItems || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Unsold Items
              </Typography>
              <Typography variant="h4">
                {statistics?.totalUnsoldItems || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Transactions Table */}
      <Paper elevation={3} sx={{ mb: 4, overflow: 'hidden',px:2 }}>
      <Box sx={{ my: 4, display: 'flex',justifyContent:"space-between",alignItems:"center"}}>
        <Box sx={{ gap: 2 ,display:"flex"}}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Select Month</InputLabel>
          <Select
            value={selectedMonth}
            label="Select Month"
            onChange={handleMonthChange}
          >
            {months.map((month, index) => (
              <MenuItem key={index + 1} value={(index + 1).toString()}>
                {month}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <TextField
          label="Search transactions"
          variant="outlined"
          value={searchText}
          onChange={handleSearch}
          sx={{ minWidth: 200 }}
        />
        </Box>
        <Typography textAlign={"center"} variant="h6">
          Transactions
        </Typography>
      </Box>
        
        <TableContainer  elevation={3} sx={{border:1,borderColor:"lightgray",maxHeight:400,overflowY:'scroll','&::-webkit-scrollbar': { display: 'none' }}} component={Paper}>
          <Table stickyHeader >
            <TableHead sx={{bgcolor:"lightgray"}}>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Sold</TableCell>
                <TableCell>Image</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.data.map((transaction, index) => (
                <TableRow hover key={index}>
                  <TableCell>{transaction.title}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>${transaction.price}</TableCell>
                  <TableCell>{transaction.category}</TableCell>
                  <TableCell>{transaction.sold ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <img src={transaction.image} alt="image" width={50}/>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            variant="contained"
          >
            Previous
          </Button>
          <Typography>
            Page {currentPage} of {transactions.totalPages}
          </Typography>
          <Button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage === transactions.totalPages}
            variant="contained"
          >
            Next
          </Button>
        </Box>
      </Paper>

      {/* Charts Grid */}
      <Grid container spacing={3}>
        {/* Bar Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Price Range Distribution
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="range" 
                    angle={-45}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#1976d2" name="Number of Items" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Pie Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Category Distribution
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    // label={CustomPieChartLabel}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default App;