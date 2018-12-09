FROM nginx:1-alpine

ENV address=test.localhost

RUN apk add openssl; \
    mkdir -p /ssl/ ;\
    openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
    -keyout /ssl/ssl.key -out /ssl/ssl.crt \
    -subj "/C=US/ST=CA/L=LA/O=MorTorq Robotics /OU=Programming/CN=MorTorq Team 1515"

RUN mkdir -p /nginx


COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN envsubst '\$address' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf

COPY morteam.conf /etc/nginx/sites-available/morteam.conf
RUN envsubst '\$address' < /etc/nginx/sites-available/morteam.conf > /etc/nginx/sites-available/morteam.conf

COPY morscout.conf /etc/nginx/sites-available/morscout.conf
RUN envsubst '\$address' < /etc/nginx/sites-available/morscout.conf > /etc/nginx/sites-available/morscout.conf

COPY morparts.conf /etc/nginx/sites-available/morparts.conf
RUN envsubst '\$address' < /etc/nginx/sites-available/morparts.conf > /etc/nginx/sites-available/morparts.conf


EXPOSE 443
EXPOSE 80