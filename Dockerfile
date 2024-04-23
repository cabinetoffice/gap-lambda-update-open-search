FROM public.ecr.aws/lambda/nodejs:18-x86_64

 # Copy function code
COPY index.mjs package.json ./

# Install project dependencies
RUN npm install --production

# Start the application
CMD ["index.handler"]