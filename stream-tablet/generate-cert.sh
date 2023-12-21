openssl genrsa -out key.pem 1024
openssl req -new -key key.pem -out server-csr.pem
openssl x509 -req -in server-csr.pem -signkey key.pem -out cert.pem