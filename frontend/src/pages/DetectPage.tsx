import React from 'react';
import { Box, Typography, Container } from '@mui/material';

const DetectPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ 
        backgroundColor: '#e3f2fd', 
        p: 2, 
        mb: 3, 
        borderRadius: 1,
        textAlign: 'center',
        mt: 4
      }}>
        <Typography variant="h6" color="primary">
          Welcome to Sign Language Detection
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          Please use our system to learn and practice sign language.
        </Typography>
      </Box>
    </Container>
  );
};

export default DetectPage;
