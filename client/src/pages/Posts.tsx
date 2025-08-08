import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const Posts: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Beiträge
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info">
            Die Beitrags-Verwaltung wird hier implementiert.
          </Alert>
          
          <Typography variant="body1" sx={{ mt: 2 }}>
            Hier können Sie:
          </Typography>
          <ul>
            <li>Beiträge erstellen und bearbeiten</li>
            <li>Bilder zu Beiträgen hinzufügen</li>
            <li>Kommentare schreiben</li>
            <li>Sichtbarkeitseinstellungen verwalten</li>
            <li>Nach Familien filtern</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Posts;
