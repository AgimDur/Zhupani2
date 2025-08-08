import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const ForgotPassword: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Passwort vergessen
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info">
            Die Passwort-Zurücksetzung wird hier implementiert.
          </Alert>
          
          <Typography variant="body1" sx={{ mt: 2 }}>
            Hier können Sie:
          </Typography>
          <ul>
            <li>E-Mail-Adresse eingeben</li>
            <li>Reset-Link erhalten</li>
            <li>Neues Passwort setzen</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForgotPassword;
