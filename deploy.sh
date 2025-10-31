# Build client
echo "Building client..."
cd client
npm run build

# Build server
echo "Building server..."
cd ../server
npm run build

# Copy nginx config
echo "Setting up nginx..."
sudo cp ../nginx.conf /etc/nginx/sites-available/mgnrega-tracker
sudo ln -s /etc/nginx/sites-available/mgnrega-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Start application with PM2
echo "Starting application..."
pm2 start ecosystem.config.js

echo "Deployment complete!"