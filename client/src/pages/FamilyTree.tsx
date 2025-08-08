import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const FamilyTree: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Stammbaum
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info">
            Die Stammbaum-Visualisierung wird hier implementiert. 
            Diese Funktion wird D3.js verwenden, um interaktive Stammbäume zu erstellen.
          </Alert>
          
          <Typography variant="body1" sx={{ mt: 2 }}>
            Hier können Sie:
          </Typography>
          <ul>
            <li>Interaktive Stammbäume anzeigen</li>
            <li>Zoomen und verschieben</li>
            <li>Personen hinzufügen und bearbeiten</li>
            <li>Beziehungen verwalten</li>
            <li>Farbcodierung nach Geschlecht und Status</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FamilyTree;
